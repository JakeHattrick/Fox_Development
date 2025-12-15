#!/usr/bin/env python3
import psycopg2
from psycopg2.extras import execute_values
<<<<<<< HEAD

DB_CONFIG = {
    'host': 'localhost',
    'database': 'fox_db',
    'user': 'gpu_user',
    'password': '',
    'port': '5432'
}

CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS packing_daily_summary (
    pack_date DATE NOT NULL,
    model TEXT NOT NULL,
    part_number TEXT NOT NULL,
    packed_count INTEGER NOT NULL,
    PRIMARY KEY (pack_date, model, part_number)
);
'''
=======
import sys
import os
# Add Fox_ETL directory to path to find config.py
current_dir = os.path.dirname(os.path.abspath(__file__))
while current_dir != '/':
    config_path = os.path.join(current_dir, 'config.py')
    if os.path.exists(config_path):
        sys.path.insert(0, current_dir)
        break
    current_dir = os.path.dirname(current_dir)

from config import DATABASE
>>>>>>> origin/main

TRUNCATE_TABLE_SQL = 'TRUNCATE TABLE packing_daily_summary;'

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
  AND history_station_end_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY pack_date, model, part_number
ORDER BY model, part_number, pack_date;
'''

INSERT_SQL = '''
INSERT INTO packing_daily_summary (
    pack_date, model, part_number, packed_count
) VALUES %s
ON CONFLICT (pack_date, model, part_number) DO UPDATE SET
    packed_count = EXCLUDED.packed_count;
'''

def main():
<<<<<<< HEAD
    conn = psycopg2.connect(**DB_CONFIG)
=======
    conn = psycopg2.connect(**DATABASE)
>>>>>>> origin/main
    try:
        with conn.cursor() as cur:
            print("Creating packing_daily_summary table with primary key if not exists...")
            cur.execute(CREATE_TABLE_SQL)
            conn.commit()

            print("Truncating packing_daily_summary table...")
            cur.execute(TRUNCATE_TABLE_SQL)
            conn.commit()

            print("Aggregating all packing data from workstation_master_log with business rule for weekends...")
            cur.execute(AGGREGATE_SQL)
            conn.commit()
            rows_affected = cur.rowcount
            print(f"Aggregated and inserted {rows_affected} records.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main() 