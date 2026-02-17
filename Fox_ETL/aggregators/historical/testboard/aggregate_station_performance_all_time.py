import psycopg2
from psycopg2.extras import execute_values
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

CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS testboard_station_performance_daily (
    end_date DATE NOT NULL,
    model TEXT NOT NULL,
    work_station_process TEXT NOT NULL,
    workstation_name TEXT NOT NULL,
    pass INTEGER NOT NULL,
    fail INTEGER NOT NULL,
    total INTEGER NOT NULL,
    failurerate NUMERIC(5,3) NOT NULL,
    PRIMARY KEY (end_date, model, work_station_process, workstation_name)
);
'''

TRUNCATE_TABLE_SQL = 'TRUNCATE TABLE testboard_station_performance_daily;'

AGGREGATE_SQL = '''
SELECT
    DATE(history_station_end_time) AS end_date,
    model,
    work_station_process,
    workstation_name,
    COUNT(*) AS total,
    COUNT(CASE WHEN history_station_passing_status = 'Pass' THEN 1 END) AS pass,
    COUNT(CASE WHEN history_station_passing_status = 'Fail' THEN 1 END) AS fail,
    ROUND(
        COUNT(CASE WHEN history_station_passing_status = 'Fail' THEN 1 END)::numeric /
        NULLIF(COUNT(*), 0), 3
    ) AS failurerate
FROM testboard_master_log
WHERE history_station_end_time IS NOT NULL
GROUP BY end_date, model, work_station_process, workstation_name
ORDER BY end_date DESC, model, work_station_process, workstation_name;
'''

INSERT_SQL = '''
INSERT INTO testboard_station_performance_daily (
    end_date, model, work_station_process, workstation_name, pass, fail, total, failurerate
) VALUES %s
ON CONFLICT (end_date, model, work_station_process, workstation_name) DO UPDATE SET
    pass = EXCLUDED.pass,
    fail = EXCLUDED.fail,
    total = EXCLUDED.total,
    failurerate = EXCLUDED.failurerate;
'''

def main():
    conn = psycopg2.connect(**DATABASE)
    try:
        with conn.cursor() as cur:
            print("Creating summary table with primary key if not exists...")
            cur.execute(CREATE_TABLE_SQL)
            conn.commit()

            print("truncation testboard_station_performance_daily")
            cur.execute(TRUNCATE_TABLE_SQL)
            conn.commit()

            print("Aggregating all historical data from testboard_master_log...")
            cur.execute(AGGREGATE_SQL)
            rows = cur.fetchall()
            print(f"Aggregated {len(rows)} rows.")

            if rows:
                values = [(
                    r[0], r[1], r[2], r[3], r[5], r[6], r[4], r[7]
                ) for r in rows]
                execute_values(cur, INSERT_SQL, values)
                conn.commit()
                print("Aggregation complete, data deduplicated and upserted.")
            else:
                print("No data to aggregate.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main() 