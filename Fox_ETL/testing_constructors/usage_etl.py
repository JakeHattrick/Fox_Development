import psycopg2
import pandas as pd
import glob
import os
from psycopg2.extras import execute_values
from config import DATABASE


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
def connect_to_db():
    return psycopg2.connect(**DATABASE)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean_column_name(name):
    return "".join(c for c in name.lower().replace(" ", "_") if c.isalnum() or c == "_")


def empty_to_none(val):
    if pd.isna(val):
        return None
    if isinstance(val, str) and not val.strip():
        return None
    return val


def normalize_slot(slot):
    if not slot:
        return None
    slot = slot.upper()
    return slot if slot in ("LA", "RA") else None


# ---------------------------------------------------------------------------
# Main ETL
# ---------------------------------------------------------------------------
def main():
    conn = connect_to_db()
    cursor = conn.cursor()

    # -----------------------------------------------------------------------
    # Fixture + Slot lookup
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
    # Read input files
    # -----------------------------------------------------------------------
    base_dir = os.path.dirname(os.path.abspath(__file__))
    excel_files = glob.glob(
        os.path.join(base_dir, "input", "usage", "**", "*.xlsx"),
        recursive=True
    )

    total_inserted = 0

    for file in excel_files:
        print(f"Processing {os.path.basename(file)}")

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
                print(f"  Missing fixture_part: {fixture_name} {slot}")
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

    cursor.close()
    conn.close()

    print(f"\n Total usage rows inserted: {total_inserted}")


if __name__ == "__main__":
    main()
