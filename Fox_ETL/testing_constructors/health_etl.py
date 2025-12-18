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
def create_health_table(conn):
    print("Creating/verifying health table...")
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS health (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fixture_id UUID NOT NULL REFERENCES fixtures(id),
        status VARCHAR(32)
            CHECK (status IN ('active', 'no_response', 'under_maintenance', 'RMA')),
        comments VARCHAR(256),
        creator VARCHAR(32),
        create_date TIMESTAMPTZ DEFAULT NOW()
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


def normalize_status(value):
    if not value:
        return None

    value = value.strip().lower()
    mapping = {
        "active": "active",
        "no response": "no_response",
        "no_response": "no_response",
        "maintenance": "under_maintenance",
        "under maintenance": "under_maintenance",
        "under_maintenance": "under_maintenance",
        "rma": "RMA"
    }

    return mapping.get(value)


# ---------------------------------------------------------------------------
# Main ETL Logic
# ---------------------------------------------------------------------------
def main():
    print("Starting health data upload process...")

    try:
        conn = connect_to_db()
        print("Database connection successful")
    except Exception as e:
        print(f"Database connection failed: {e}")
        return

    create_health_table(conn)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_path = os.path.join(script_dir, "input", "health", "**", "*.xlsx")
    excel_files = glob.glob(os.path.normpath(excel_path), recursive=True)

    print(f"Found {len(excel_files)} health files")

    if not excel_files:
        print("No health Excel files found.")
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
                status = normalize_status(
                    convert_empty_string(row.get("status"))
                )
                comments = convert_empty_string(row.get("comments"))
                creator = convert_empty_string(row.get("creator")) or "etl"

                if not fixture_name or not status:
                    continue

                fixture_id = fixture_lookup.get(fixture_name)

                if not fixture_id:
                    print(f"  Fixture not found: {fixture_name}")
                    continue

                rows_to_insert.append((
                    fixture_id,
                    status,
                    comments,
                    creator
                ))

            insert_query = """
            INSERT INTO health (
                fixture_id,
                status,
                comments,
                creator
            ) VALUES %s;
            """

            execute_values(cursor, insert_query, rows_to_insert)
            conn.commit()

            imported = len(rows_to_insert)
            total_imported += imported
            print(f" Imported {imported:,} health records")

        except Exception as e:
            print(f"  Error importing {os.path.basename(file_path)}: {e}")
            conn.rollback()

    cursor.close()
    conn.close()

    print(f"\n Total health records imported: {total_imported:,}")


if __name__ == "__main__":
    main()
