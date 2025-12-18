import psycopg2
import pandas as pd
import glob
import os
from psycopg2.extras import execute_values

# ---------------------------------------------------------------------------
# Database Connection (hardcoded)
# ---------------------------------------------------------------------------
def connect_to_db():
    """
    Connect to the Postgres database using hardcoded credentials.
    Returns:
        psycopg2 connection object
    """
    try:
        conn = psycopg2.connect(
            host="localhost",      # replace with production host if needed
            database="fox_db",
            user="gpu_user",
            password="",           # add password if required
            port="5432"
        )
        print(" Database connection successful")
        return conn
    except Exception as e:
        print(f" Database connection failed: {e}")
        raise

# ---------------------------------------------------------------------------
# Table Verification
# ---------------------------------------------------------------------------
def create_usage_table(conn):
    """
    Create the usage table if it does not exist.
    """
    print("Creating/verifying usage table...")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usage (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            fixture_part_id UUID NOT NULL REFERENCES fixture_parts(id),
            test_slot VARCHAR(16) NOT NULL CHECK (test_slot IN ('LA', 'RA')),
            test_station VARCHAR(32),
            test_type VARCHAR(32) CHECK (test_type IN ('Refurbish', 'Sort', 'Debug')),
            gpu_pn VARCHAR(32),
            gpu_sn VARCHAR(32),
            log_path VARCHAR(256),
            creator VARCHAR(32),
            create_date TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    conn.commit()
    cursor.close()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean_column_name(name):
    """
    Normalize Excel column names to lowercase and underscores.
    """
    return "".join(c for c in name.lower().replace(" ", "_") if c.isalnum() or c == "_")

def empty_to_none(val):
    """
    Convert empty strings or NaN to None
    """
    if pd.isna(val):
        return None
    if isinstance(val, str) and not val.strip():
        return None
    return val

def normalize_slot(slot):
    """
    Normalize test slot values to 'LA' or 'RA'
    """
    if not slot:
        return None
    slot = slot.upper()
    return slot if slot in ("LA", "RA") else None

# ---------------------------------------------------------------------------
# Main ETL
# ---------------------------------------------------------------------------
def main():
    conn = connect_to_db()

    # Ensure the usage table exists
    create_usage_table(conn)

    cursor = conn.cursor()

    # -----------------------------------------------------------------------
    # Build fixture_part lookup table
    # -----------------------------------------------------------------------
    cursor.execute("""
        SELECT
            fp.id,
            fp.tester_type,
            fp.fixture_name
        FROM fixture_parts fp;
    """)

    fixture_part_lookup = {}
    for fid, tester_type, fixture_name in cursor.fetchall():
        slot = "LA" if "LA" in tester_type else "RA"
        fixture_part_lookup[(fixture_name, slot)] = fid

    # -----------------------------------------------------------------------
    # Read input Excel files
    # -----------------------------------------------------------------------
    base_dir = os.path.dirname(os.path.abspath(__file__))
    excel_files = glob.glob(
        os.path.join(base_dir, "input", "usage", "**", "*.xlsx"),
        recursive=True
    )

    if not excel_files:
        print("No usage Excel files found.")
        conn.close()
        return

    total_inserted = 0

    for file in excel_files:
        print(f"\nProcessing {os.path.basename(file)}")

        df = pd.read_excel(file)
        df.columns = [clean_column_name(c) for c in df.columns]

        rows = []

        for _, r in df.iterrows():
            fixture_name = empty_to_none(r.get("fixture_name"))
            slot = normalize_slot(empty_to_none(r.get("test_slot")))
            test_type = empty_to_none(r.get("test_type"))
            test_station = empty_to_none(r.get("test_station"))
            gpu_pn = empty_to_none(r.get("gpu_pn"))
            gpu_sn = empty_to_none(r.get("gpu_sn"))
            log_path = empty_to_none(r.get("log_path"))
            creator = empty_to_none(r.get("creator")) or "etl"

            if not fixture_name or not slot:
                continue

            fixture_part_id = fixture_part_lookup.get((fixture_name, slot))
            if not fixture_part_id:
                print(f"  ⚠ Missing fixture_part: {fixture_name} {slot}")
                continue

            rows.append((
                fixture_part_id,
                slot,
                test_station,
                test_type,
                gpu_pn,
                gpu_sn,
                log_path,
                creator
            ))

        if rows:
            execute_values(cursor, """
                INSERT INTO usage (
                    fixture_part_id,
                    test_slot,
                    test_station,
                    test_type,
                    gpu_pn,
                    gpu_sn,
                    log_path,
                    creator
                ) VALUES %s;
            """, rows)
            conn.commit()
            total_inserted += len(rows)
            print(f"   Inserted {len(rows):,} rows from {os.path.basename(file)}")

    cursor.close()
    conn.close()
    print(f"\nTotal usage rows inserted: {total_inserted:,}")

# ---------------------------------------------------------------------------
if __name__ == "__main__":
    main()
