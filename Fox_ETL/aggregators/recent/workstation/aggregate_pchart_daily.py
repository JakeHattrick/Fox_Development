#!/usr/bin/env python3
"""
Aggregate workstation data for P-Chart analysis for the last 7 days.
Groups by part number, model, workstation, and service flow to track pass/fail counts.
"""
import psycopg2
import logging
from datetime import datetime
import pandas as pd
<<<<<<< HEAD
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

# Setup simple console logging
logging.basicConfig(
    level=logging.INFO,
<<<<<<< HEAD
    format='%(asctime)s - %(levelname)s - %(message)s'
=======
    format='%(levelname)s - %(message)s'
>>>>>>> origin/main
)

def connect_to_db():
    """Establish database connection"""
<<<<<<< HEAD
    logging.info('🔌 Connecting to database...')
    return psycopg2.connect(
        host="localhost",
        database="fox_db",
        user="gpu_user",
        password="",
        port="5432"
    )

def create_pchart_table(conn):
    """Create the P-Chart aggregation table if it doesn't exist"""
    cursor = conn.cursor()
    logging.info('Creating workstation_pchart_daily table if not exists...')
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workstation_pchart_daily (
        date DATE NOT NULL,
        pn VARCHAR(255) NOT NULL,
        model VARCHAR(255),
        workstation_name VARCHAR(255) NOT NULL,
        service_flow VARCHAR(255),
        total_count INTEGER NOT NULL,
        pass_count INTEGER NOT NULL,
        fail_count INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (date, pn, workstation_name, service_flow)
    );
    """)
    conn.commit()
    cursor.close()
    logging.info('Table check/creation complete.')
=======
    return psycopg2.connect(**DATABASE)

def create_pchart_table(conn):
    """Create pchart_daily table if it doesn't exist"""
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pchart_daily (
            date DATE NOT NULL,
            pn TEXT NOT NULL,
            model TEXT NOT NULL,
            workstation_name TEXT NOT NULL,
            service_flow TEXT NOT NULL,
            total_count INTEGER NOT NULL DEFAULT 0,
            pass_count INTEGER NOT NULL DEFAULT 0,
            fail_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (date, pn, model, workstation_name, service_flow)
        );
    """)
    conn.commit()
    cursor.close()
>>>>>>> origin/main

def aggregate_daily_data(conn):
    """Aggregate workstation data for the last 7 days"""
    cursor = conn.cursor()
    logging.info('Starting 7-day window aggregation...')
    
    # Aggregate query with 7-day window
    query = """
    INSERT INTO workstation_pchart_daily (
        date,
        pn,
        model,
        workstation_name,
        service_flow,
        total_count,
        pass_count,
        fail_count
    )
    SELECT 
        DATE(history_station_end_time) as date,
        pn,
        model,
        workstation_name,
        service_flow,
        COUNT(*) as total_count,
        COUNT(CASE WHEN history_station_passing_status = 'Pass' THEN 1 END) as pass_count,
        COUNT(CASE WHEN history_station_passing_status != 'Pass' THEN 1 END) as fail_count
    FROM workstation_master_log
    WHERE history_station_end_time IS NOT NULL
        AND service_flow NOT IN ('NC Sort', 'RO')
        AND service_flow IS NOT NULL
        AND history_station_end_time >= CURRENT_DATE - INTERVAL '6 days'
        AND history_station_end_time <= CURRENT_DATE
    GROUP BY 
        DATE(history_station_end_time),
        pn,
        model,
        workstation_name,
        service_flow
    ORDER BY 
        DATE(history_station_end_time),
        pn,
        workstation_name
    ON CONFLICT (date, pn, workstation_name, service_flow) 
    DO UPDATE SET
        total_count = EXCLUDED.total_count,
        pass_count = EXCLUDED.pass_count,
        fail_count = EXCLUDED.fail_count,
        model = EXCLUDED.model;
    """
    
    cursor.execute(query)
    rows_affected = cursor.rowcount
    conn.commit()
    cursor.close()
    
    logging.info(f'Aggregation complete. {rows_affected} rows affected.')
    return rows_affected

def main():
    logging.info("="*50)
    logging.info("Starting P-Chart daily aggregation process (last 7 days)...")
    
    try:
        conn = connect_to_db()
        create_pchart_table(conn)
        rows_affected = aggregate_daily_data(conn)
        
        logging.info("Successfully aggregated data:")
        logging.info(f"   - {rows_affected:,} daily records processed")
        
    except Exception as e:
        logging.error(f"Error during aggregation: {str(e)}")
        raise
    
    finally:
        if conn:
            conn.close()
            logging.info("🔌 Database connection closed.")
        logging.info("="*50)

if __name__ == "__main__":
    main()