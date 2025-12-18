import psycopg2
import pandas as pd
import glob
import os
from psycopg2.extras import execute_values
from db_config import DATABASE

#----------------------------------------------------------------------
# DATABASE Connection
#----------------------------------------------------------------------
def connect_to_db():
    print("Attempting to connect database...")
    return psycopg2.connect(**DATABASE)

#----------------------------------------------------------------------
# Table Verification
#----------------------------------------------------------------------
def create_fixture_table(conn):
    print("Creating/verifying fixture table ...")
    cursor = conn.cursor()
    cursor.execute("""
     CREATE TABLE IF NOT EXISTS fixtures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fixture_name VARCHAR(32) UNIQUE NOT NULL,
        gen_type VARCHAR(32) NOT NULL
            CHECK (gen_type IN ('Gen3 B Tester', 'Gen5 B Tester')),
        rack VARCHAR(32),
        fixture_sn VARCHAR(32),
        test_type VARCHAR(32)
            CHECK (test_type IN ('Refurbish', 'Sort', 'Debug')),
        ip_address VARCHAR(16),
        mac_address VARCHAR(17),
        create_date TIMESTAMPTZ DEFAULT NOW(),
        creator VARCHAR(32)
    );
    """)

    conn.commit()
    cursor.close()

#----------------------------------------------------------------------
# Helpers
#----------------------------------------------------------------------
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

#----------------------------------------------------------------------
# Main ETL logic
#----------------------------------------------------------------------
def main():
    print("Starting fixture data upload process...")

    try:
        conn = connect_to_db()
        print("Database connection successful")
    except Exception as e:
        print(f"Database connection failed: {e}")
        return

    create_fixtures_table(conn)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_path = os.path.join(script_dir, "input", "fixtures", "**", "*.xlsx")
    excel_files = glob.glob(os.path.normpath(excel_path), recursive=True)

    print(f"Found {len(excel_files)} fixture files")

    if not excel_files:
        print("No fixture Excel files found.")
        return

    total_imported = 0

    for i, file_path in enumerate(excel_files, 1):
        print(f"\nProcessing file {i}/{len(excel_files)}: {os.path.basename(file_path)}")

        try:
            df = pd.read_excel(file_path)
            print(f"Read {len(df)} rows")

            df.columns = [clean_column_name(c) for c in df.columns]

            mapped_rows = []
            for _, row in df.iterrows():
                mapped_rows.append((
                    convert_empty_string(row.get("fixture_name")),
                    convert_empty_string(row.get("gen_type")),
                    convert_empty_string(row.get("rack")),
                    convert_empty_string(row.get("fixture_sn")),
                    convert_empty_string(row.get("test_type")),
                    convert_empty_string(row.get("ip_address")),
                    convert_empty_string(row.get("mac_address")),
                    convert_empty_string(row.get("creator")),
                ))

            cursor = conn.cursor()

            insert_query = """
            INSERT INTO fixtures (
                fixture_name,
                gen_type,
                rack,
                fixture_sn,
                test_type,
                ip_address,
                mac_address,
                creator
            ) VALUES %s
            ON CONFLICT (fixture_name)
            DO NOTHING;
            """

            execute_values(cursor, insert_query, mapped_rows)
            conn.commit()
            cursor.close()

            imported = len(mapped_rows)
            total_imported += imported
            print(f" Imported {imported:,} fixtures")

        except Exception as e:
            print(f"  Error importing {os.path.basename(file_path)}: {e}")
            conn.rollback()

    print(f"\n Total fixtures imported: {total_imported:,}")
    conn.close()


if __name__ == "__main__":
    main()

