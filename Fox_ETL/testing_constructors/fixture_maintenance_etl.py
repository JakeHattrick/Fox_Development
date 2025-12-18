import psycopg2
import pandas as pd
import glob
import os
from psycopg2.extras import execute_values

# ---------------------------------------------------------------------------
# Database Connection (hardcoded)
# ---------------------------------------------------------------------------
def connect_to_db():
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
def create_fixture_maintenance_table(conn):
    """
    Create the fixture_maintenance table if it does not exist
    """
    print("Creating/verifying fixture_maintenance table...")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fixture_maintenance (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            fixture_id UUID NOT NULL REFERENCES fixtures(id),
            event_type VARCHAR(32) CHECK (event_type IN ('Scheduled Maintenance', 'Emergency Maintenance', 'Unknown Outage')),
            start_date_time TIMESTAMPTZ,
            end_date_time TIMESTAMPTZ,
            occurance VARCHAR(32) CHECK (occurance IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Once')),
            comments VARCHAR(256),
            is_completed BOOLEAN DEFAULT FALSE,
            creator VARCHAR(32),
            create_date TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    conn.commit()
    cursor.close()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean_column_name(col):
    return "".join(c for c in col.lower().replace(" ", "_") if c.isalnum() or c == "_")

def empty_to_none(val):
    if pd.isna(val):
        return None
    if isinstance(val, str) and not val.strip():
        return None
    return val

def normalize_event_type(val):
    allowed = {
        "scheduled maintenance": "Scheduled Maintenance",
        "emergency maintenance": "Emergency Maintenance",
        "unknown outage": "Unknown Outage",
    }
    return allowed.get(val.lower()) if val else None

def normalize_occurance(val):
    allowed = {"daily", "weekly", "monthly", "quarterly", "once"}
    return val.capitalize() if val and val.lower() in allowed else None

# ---------------------------------------------------------------------------
# Main ETL
# ---------------------------------------------------------------------------
def main():
    conn = connect_to_db()

    # Ensure fixture_maintenance table exists
    create_fixture_maintenance_table(conn)

    cursor = conn.cursor()

    # Build fixture lookup
    cursor.execute("SELECT id, fixture_name FROM fixtures;")
    fixture_lookup = {name: fid for fid, name in cursor.fetchall()}

    # Read input Excel files
    base_dir = os.path.dirname(os.path.abspath(__file__))
    excel_files = glob.glob(
        os.path.join(base_dir, "input", "fixture_maintenance", "**", "*.xlsx"),
        recursive=True
    )

    if not excel_files:
        print("No fixture_maintenance Excel files found.")
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
            if not fixture_name:
                continue

            fixture_id = fixture_lookup.get(fixture_name)
            if not fixture_id:
                print(f"   Unknown fixture: {fixture_name}")
                continue

            event_type = normalize_event_type(empty_to_none(r.get("event_type")))
            if not event_type:
                continue

            rows.append((
                fixture_id,
                event_type,
                empty_to_none(r.get("start_date_time")),
                empty_to_none(r.get("end_date_time")),
                normalize_occurance(empty_to_none(r.get("occurance"))),
                empty_to_none(r.get("comments")),
                bool(r.get("is_completed", False)),
                empty_to_none(r.get("creator")) or "etl"
            ))

        if rows:
            execute_values(cursor, """
                INSERT INTO fixture_maintenance (
                    fixture_id,
                    event_type,
                    start_date_time,
                    end_date_time,
                    occurance,
                    comments,
                    is_completed,
                    creator
                ) VALUES %s;
            """, rows)
            conn.commit()
            total_inserted += len(rows)
            print(f"   Inserted {len(rows):,} rows from {os.path.basename(file)}")

    cursor.close()
    conn.close()
    print(f"\nTotal maintenance events inserted: {total_inserted}")

# ---------------------------------------------------------------------------
if __name__ == "__main__":
    main()
