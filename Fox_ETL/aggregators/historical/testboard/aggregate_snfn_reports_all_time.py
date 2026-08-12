
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
CREATE TABLE IF NOT EXISTS snfn_aggregate_daily (
    fixture_no TEXT NOT NULL,
    workstation_name TEXT NOT NULL,
    sn TEXT NOT NULL,
    pn TEXT,
    model TEXT NOT NULL,
    error_code TEXT NOT NULL,
    error_disc TEXT,
    history_station_end_time TIMESTAMP NOT NULL,
    PRIMARY KEY (sn, fixture_no, model, workstation_name, error_code, history_station_end_time)
);
'''
TRUNCATE_TABLE_SQL = 'TRUNCATE TABLE snfn_aggregate_daily;'

checker_command = "SELECT * FROM snfn_aggregate_daily LIMIT 1;"

AGGREGATE_SQL = '''
SELECT DISTINCT
    fixture_no,
    workstation_name,
    sn,
    pn,
    model,
    CONCAT('EC', RIGHT(failure_reasons, 3)) AS error_code,
    failure_note AS error_disc,
    history_station_end_time
FROM testboard_master_log
WHERE history_station_end_time IS NOT NULL
AND history_station_passing_status = 'Fail'
ORDER BY history_station_end_time DESC;
'''

INSERT_SQL = '''
INSERT INTO snfn_aggregate_daily (
    fixture_no, workstation_name, sn, pn, model, error_code, error_disc, history_station_end_time
) VALUES %s
ON CONFLICT (sn, fixture_no, model, workstation_name, error_code, history_station_end_time) 
DO UPDATE SET
    error_code = EXCLUDED.error_code,
    error_disc = EXCLUDED.error_disc,
    pn = EXCLUDED.pn;
'''

def main():
    conn = psycopg2.connect(**DATABASE)
    try:
        with conn.cursor() as cur:
            print("Creating snfn_aggregate_daily table if not exists...")
            cur.execute(CREATE_TABLE_SQL)
            conn.commit()

            print("Checking random row in current table")
            cur.execute(checker_command)  
            conn.commit()

            try:
                rows = cur.fetchall()
                print(f"Current snfn_aggregate_daily has {len(rows)} rows.")
            except psycopg2.ProgrammingError:
                print("snfn_aggregate_daily is empty or does not exist, proceeding with aggregation.")

            print("Truncating snfn_aggregate_daily...")
            cur.execute(TRUNCATE_TABLE_SQL)
            conn.commit()

            try:
                rows = cur.fetchall()
                print(f"Current snfn_aggregate_daily has {len(rows)} rows.")
            except psycopg2.ProgrammingError:
                print("snfn_aggregate_daily is empty or does not exist, proceeding with aggregation.")

            print("Checking if there are no rows after truncation")
            cur.execute(checker_command)  
            conn.commit()

            print("Aggregating snfn report data from testboard_master_log...")
            cur.execute(AGGREGATE_SQL)
            rows = cur.fetchall()
            print(f"Aggregated {len(rows)} rows.")

            if rows:
                # Process rows one by one to avoid bulk insert conflicts
                success_count = 0
                error_count = 0
                
                single_insert_sql = '''
                INSERT INTO snfn_aggregate_daily (
                    fixture_no, workstation_name, sn, pn, model, error_code, error_disc, history_station_end_time
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (sn, fixture_no, model, workstation_name, error_code, history_station_end_time) 
                DO UPDATE SET
                    error_code = EXCLUDED.error_code,
                    error_disc = EXCLUDED.error_disc,
                    pn = EXCLUDED.pn;
                '''
                
                for r in rows:
                    try:
                        cur.execute(single_insert_sql, (
                            r[0],  # fixture_no
                            r[1],  # workstation_name
                            r[2],  # sn
                            r[3],  # pn
                            r[4],  # model
                            r[5],  # error_code
                            r[6],  # error_disc
                            r[7]   # history_station_end_time
                        ))
                        success_count += 1
                    except Exception as row_error:
                        print(f"Error processing row {r}: {row_error}")
                        error_count += 1
                        # Continue with next row instead of rolling back everything
                        conn.rollback()
                        # Start a new transaction
                        cur = conn.cursor()
                
                conn.commit()
                print(f"SNFN report aggregation complete. Successfully processed {success_count} rows, {error_count} errors.")
            else:
                print("No data to aggregate.")
                
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main()