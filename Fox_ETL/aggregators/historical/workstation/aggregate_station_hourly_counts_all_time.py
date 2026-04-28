import psycopg2
from datetime import datetime
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

def create_summary_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS station_hourly_summary (
                date DATE NOT NULL,
                hour INTEGER NOT NULL,
                workstation_name TEXT NOT NULL,
                part_count INTEGER NOT NULL,
                PRIMARY KEY (date, hour, workstation_name)
            );
        """)
    conn.commit()

def aggregate_station_hourly_counts():
    conn = psycopg2.connect(**DATABASE)
    try:
        create_summary_table(conn)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    DATE(history_station_end_time) AS date,
                    EXTRACT(HOUR FROM history_station_end_time)::int AS hour,
                    workstation_name,
                    COUNT(*) AS part_count
                FROM
                    workstation_master_log
                WHERE
                    history_station_end_time IS NOT NULL
                GROUP BY
                    DATE(history_station_end_time),
                    EXTRACT(HOUR FROM history_station_end_time),
                    workstation_name
                ORDER BY
                    date, hour, workstation_name;
            """)
            results = cur.fetchall()
            print(f"{'Date':<12} {'Hour':<4} {'Station':<16} {'Count':<6}")
            print("-" * 40)
            for date, hour, station, count in results:
                print(f"{date} {hour:>2}   {station:<16} {count:<6}")
                cur.execute("""
                    INSERT INTO station_hourly_summary (date, hour, workstation_name, part_count)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (date, hour, workstation_name)
                    DO UPDATE SET part_count = EXCLUDED.part_count;
                """, (date, hour, station, count))
        conn.commit()
        print("\nAggregated data has been saved to station_hourly_summary table.")
    finally:
        conn.close()

if __name__ == "__main__":
    aggregate_station_hourly_counts() 