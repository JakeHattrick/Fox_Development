import psycopg2
import pandas as pd
import glob
import os
from psycopg2.extras import execute_values
from config import DATABASE


# ---------------------------------------------------------------------------
# Database Connection
# ---------------------------------------------------------------------------
def connect_to_db():
    print("Attempting to connect to database...")
    return psycopg2.connect(**DATABASE)


# ---------------------------------------------------------------------------
# Table Verification
# ---------------------------------------------------------------------------
def create_fixture_parts_table(conn):
    print("Creating/verifying fixture_parts table...")
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fixture_parts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_fixture_id UUID NOT NULL REFERENCES fixtures(id),
        tester_type VARCHAR(32) NOT NULL
            CHECK (tester_type IN ('LA Slot', 'RA Slot')),
        fixture_name VARCHAR(32),
        gen_type VARCHAR(32),
        rack VARCHAR(32),
        fixture_sn VARCHAR(32),
        test_type VARCHAR(32),
        ip_address VARCHAR(16),
        mac_address VARCHAR(17),
        create_date TIMESTAMPTZ DEFAULT NOW(),
        creator VARCHAR(32)
    );
    """)
    conn.commit()
    cursor.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean_column_name(col_name):
    cleaned = col_name.lower().replace(" ", "_").replace("-", "_")
    cleaned = "".join(c for c in cleaned if c.isalnum() or c == "_")
    return cleaned


def convert_empty_string(value):
    if pd.isna(value):
        return None
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


def normalize_tester_type(value):
    if not value:
        return None

    value = value.strip().upper()
    if value in ("LA", "LEFT", "LEFT SLOT"):
        return "LA Slot"
    if value in ("RA", "RIGHT", "RIGHT SLOT"):
        return "RA Slot"

    return value  # assume already valid


# ---------------------------------------------------------------------------
# Main ETL Logic
# ---------------------------------------------------------------------------
def main():
    print("Starting fixture_parts data upload process...")

    try:
        conn = connect_to_db()
        print("Database connection successful")
    except Exception as e:
        print(f"Database connection failed: {e}")
        return

    create_fixture_parts_table(conn)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_path = os.path.join(script_dir, "input", "fixture_parts", "**", "*.xlsx")
    excel_files = glob.glob(os.path.normpath(excel_path), recursive=True)

    print(f"Found {len(excel_files)} fixture_parts files")

    if not excel_files:
        print("No fixture_parts Excel files found.")
        return

    cursor = conn.cursor()

    # Cache fixture_name → fixture_id
    cursor.execute("SELECT id, fixture_name FROM fixtures;")
    fixture_lookup = {row[1]: row[0] for row in cursor.fetchall()}

    total_imported = 0

    for i, file_path in enumerate(excel_files, 1):
        print(f"\nProcessing file {i}/{len(excel_files)}: {os.path.basename(file_path)}")

        try:
            df = pd.read_excel(file_path)
            print(f"Read {len(df)} rows")

            df.columns = [clean_column_name(c) for c in df.columns]

            rows_to_insert = []

            for _, row in df.iterrows():
                fixture_name = convert_empty_string(row.get("fixture_name"))
                tester_type = normalize_tester_type(
                    convert_empty_string(row.get("tester_type"))
                )
                creator = convert_empty_string(row.get("creator")) or "etl"

                if not fixture_name or not tester_type:
                    continue

                parent_fixture_id = fixture_lookup.get(fixture_name)

                if not parent_fixture_id:
                    print(f" ⚠️ Fixture not found: {fixture_name}")
                    continue

                rows_to_insert.append((
                    parent_fixture_id,
                    tester_type,
                    fixture_name,
                    creator
                ))

            insert_query = """
            INSERT INTO fixture_parts (
                parent_fixture_id,
                tester_type,
                fixture_name,
                creator
            ) VALUES %s
            ON CONFLICT DO NOTHING;
            """

            execute_values(cursor, insert_query, rows_to_insert)
            conn.commit()

            imported = len(rows_to_insert)
            total_imported += imported
            print(f" Imported {imported:,} fixture_parts")

        except Exception as e:
            print(f" ❌ Error importing {os.path.basename(file_path)}: {e}")
            conn.rollback()

    cursor.close()
    conn.close()

    print(f"\n Total fixture_parts imported: {total_imported:,}")


if __name__ == "__main__":
    main()
