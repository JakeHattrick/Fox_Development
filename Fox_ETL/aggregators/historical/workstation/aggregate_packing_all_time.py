import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from config import DATABASE

CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS packing_daily_summary (
    pack_date DATE NOT NULL,
    model TEXT NOT NULL,
    part_number TEXT NOT NULL,
    packed_count INTEGER NOT NULL,
    PRIMARY KEY (pack_date, model, part_number)
);
'''

AGGREGATE_SQL = '''
INSERT INTO packing_daily_summary (
    pack_date, model, part_number, packed_count
)
SELECT
    CASE
        WHEN EXTRACT(DOW FROM history_station_end_time) = 6 THEN DATE(history_station_end_time) - INTERVAL '1 day'  -- Saturday to Friday
        WHEN EXTRACT(DOW FROM history_station_end_time) = 0 THEN DATE(history_station_end_time) - INTERVAL '2 days'  -- Sunday to Friday
        ELSE DATE(history_station_end_time)
    END AS pack_date,
    model,
    pn AS part_number,
    COUNT(*) AS packed_count
FROM workstation_master_log
WHERE workstation_name = 'PACKING'
  AND history_station_passing_status = 'Pass'
GROUP BY pack_date, model, part_number
ORDER BY model, part_number, pack_date
ON CONFLICT (pack_date, model, part_number) DO UPDATE SET
    packed_count = EXCLUDED.packed_count;
'''

INSERT_SQL = '''
INSERT INTO packing_daily_summary (
    pack_date, model, part_number, packed_count
) VALUES %s
ON CONFLICT (pack_date, model, part_number) DO UPDATE SET
    packed_count = EXCLUDED.packed_count;
'''

def main():
    conn = psycopg2.connect(**DATABASE)
    try:
        with conn.cursor() as cur:
            print("Creating packing_daily_summary table with primary key if not exists...")
            cur.execute(CREATE_TABLE_SQL)
            conn.commit()

            print("Aggregating all historical packing data...")
            cur.execute(AGGREGATE_SQL)
            conn.commit()
            rows_affected = cur.rowcount
            print(f"Aggregated and upserted {rows_affected} records.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main() 