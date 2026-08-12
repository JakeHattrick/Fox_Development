#!/usr/bin/env python3
"""
Aggregate workstation data for P-Chart analysis on a daily basis.
Groups by part number, model, workstation, and service flow to track pass/fail counts.
"""
import psycopg2
import logging
from datetime import datetime
import pandas as pd
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

# Setup simple console logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def connect_to_db():
    """Establish database connection"""
    logging.info('🔌 Connecting to database...')
    return psycopg2.connect(**DATABASE)

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

def aggregate_daily_data(conn):
    """Aggregate workstation data on a daily basis"""
    cursor = conn.cursor()
    logging.info('Starting daily aggregation...')
    
    # Clear existing data
    cursor.execute("TRUNCATE TABLE workstation_pchart_daily;")
    
    # Aggregate query - Updated to match TPY script logic
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
    GROUP BY 
        DATE(history_station_end_time),
        pn,
        model,
        workstation_name,
        service_flow
    ORDER BY 
        DATE(history_station_end_time),
        pn,
        workstation_name;
    """
    
    cursor.execute(query)
    rows_affected = cursor.rowcount
    conn.commit()
    cursor.close()
    
    logging.info(f'Aggregation complete. {rows_affected} rows affected.')
    return rows_affected

def main():
    logging.info("="*50)
    logging.info("Starting P-Chart daily aggregation process...")
    
    try:
        conn = connect_to_db()
        create_pchart_table(conn)
        rows_affected = aggregate_daily_data(conn)
        
        logging.info("Successfully aggregated data:")
        logging.info(f"   - {rows_affected:,} daily records created")
        
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