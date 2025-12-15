#!/usr/bin/env python3
"""
Upload all workstation Excel files into workstation_master_log with clean schema.
"""
import psycopg2
import pandas as pd
import glob
import os
from psycopg2.extras import execute_values
import logging
from datetime import datetime
import argparse
<<<<<<< HEAD
=======
from config import DATABASE
>>>>>>> origin/main

# Setup logging
logging.basicConfig(
    filename='upload_workstation_master_log_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s %(message)s'
)
logging.info('Script started.')

def connect_to_db():
    logging.info('Connecting to database...')
<<<<<<< HEAD
    return psycopg2.connect(
        host="localhost",
        database="fox_db",
        user="gpu_user",
        password="",
        port="5432"
    )
=======
    return psycopg2.connect(**DATABASE)
>>>>>>> origin/main

def create_workstation_table(conn):
    cursor = conn.cursor()
    logging.info('Creating workstation_master_log table if not exists...')
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workstation_master_log (
        id SERIAL PRIMARY KEY,
        sn VARCHAR(255) NOT NULL,
        pn VARCHAR(255),
        model VARCHAR(255),
        workstation_name VARCHAR(255) NOT NULL,
        history_station_start_time TIMESTAMP NOT NULL,
        history_station_end_time TIMESTAMP NOT NULL,
        history_station_passing_status VARCHAR(255),
        operator VARCHAR(255),
        customer_pn VARCHAR(255),
        outbound_version VARCHAR(255),
        hours VARCHAR(255),
        service_flow VARCHAR(255),
        passing_station_method VARCHAR(255),
        first_station_start_time TIMESTAMP,
        data_source VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    try:
        cursor.execute("""
        ALTER TABLE workstation_master_log 
        ADD CONSTRAINT workstation_unique_constraint 
        UNIQUE (sn, pn, customer_pn, outbound_version, workstation_name,
                history_station_start_time, history_station_end_time, hours,
                service_flow, model, history_station_passing_status,
                passing_station_method, operator, first_station_start_time, data_source);
        """)
    except Exception as e:
        logging.info(f"Note: Unique constraint may already exist: {e}")
    
    conn.commit()
    cursor.close()
    logging.info('Table check/creation complete.')

def clean_column_name(col_name):
    cleaned = col_name.lower().replace(' ', '_').replace('-', '_')
    cleaned = ''.join(c for c in cleaned if c.isalnum() or c == '_')
    return cleaned

def convert_timestamp(value):
    if pd.isna(value):
        logging.debug(f"convert_timestamp: value is NA: {value}")
        return None
    if isinstance(value, pd.Timestamp):
        logging.debug(f"convert_timestamp: value is pd.Timestamp: {value} | tzinfo: {value.tzinfo}")
        return value.to_pydatetime()
    dt = pd.to_datetime(value)
    logging.debug(f"convert_timestamp: value after pd.to_datetime: {dt} | tzinfo: {getattr(dt, 'tzinfo', None)}")
    return dt

def convert_empty_string(value):
    if isinstance(value, str) and value.strip() == '':
        logging.debug(f"convert_empty_string: empty string detected.")
        return None
    return value

def main():
    logging.info("🚀 Uploading workstation data to workstation_master_log...")

    # Recursively find all .xlsx files in the data log/workstationreport_xlsx directory
    base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "input", "data log", "workstationreport_xlsx")
    logging.info(f"Looking for Excel files in: {base_dir}")
    workstation_files = []
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.lower().endswith('.xlsx'):
                workstation_files.append(os.path.join(root, file))

    if not workstation_files:
        logging.error(f"No Excel files found in: {base_dir}")
        return

    conn = connect_to_db()
    create_workstation_table(conn)
    
    total_imported = 0
    
    for i, file_path in enumerate(workstation_files, 1):
        logging.info(f"Processing file {i}/{len(workstation_files)}: {os.path.basename(file_path)}")
        
        try:
            df = pd.read_excel(file_path)
            logging.info(f"Read {len(df)} rows from {file_path}")
            df.columns = [clean_column_name(col) for col in df.columns]
            logging.debug(f"Cleaned columns: {df.columns.tolist()}")
            mapped_data = []
            for idx, row in df.iterrows():
                logging.debug(f"Row {idx}: {row.to_dict()}")
                mapped_row = {
                    'sn': convert_empty_string(str(row.get('sn', ''))),
                    'pn': convert_empty_string(str(row.get('pn', ''))),
                    'model': convert_empty_string(str(row.get('model', ''))),
                    'workstation_name': convert_empty_string(str(row.get('workstation_name', ''))),
                    'history_station_start_time': convert_timestamp(row.get('history_station_start_time')),
                    'history_station_end_time': convert_timestamp(row.get('history_station_end_time')),
                    'history_station_passing_status': convert_empty_string(str(row.get('history_station_passing_status', ''))),
                    'operator': convert_empty_string(str(row.get('operator', ''))),
                    'customer_pn': convert_empty_string(str(row.get('customer_pn', ''))),
                    'outbound_version': convert_empty_string(str(row.get('outbound_version', ''))),
                    'hours': convert_empty_string(str(row.get('hours', ''))),
                    'service_flow': convert_empty_string(str(row.get('service_flow', ''))),
                    'passing_station_method': convert_empty_string(str(row.get('passing_station_method', ''))),
                    'first_station_start_time': convert_timestamp(row.get('first_station_start_time')),
                    'data_source': 'workstation'
                }
                # Log all datetime fields for this row
                logging.info(f"Row {idx} mapped: SN={mapped_row['sn']} | Workstation={mapped_row['workstation_name']} | Start={mapped_row['history_station_start_time']} | End={mapped_row['history_station_end_time']} | tzinfo End={getattr(mapped_row['history_station_end_time'], 'tzinfo', None)}")
                mapped_data.append(mapped_row)
            cursor = conn.cursor()
            insert_query = """
            INSERT INTO workstation_master_log (
                sn, pn, model, workstation_name, history_station_start_time, history_station_end_time,
                history_station_passing_status, operator, customer_pn, outbound_version, hours,
                service_flow, passing_station_method, first_station_start_time, data_source
            ) VALUES %s
            ON CONFLICT ON CONSTRAINT workstation_unique_constraint
            DO NOTHING
            """
            values = [(
                row['sn'], row['pn'], row['model'], row['workstation_name'], row['history_station_start_time'], row['history_station_end_time'],
                row['history_station_passing_status'], row['operator'], row['customer_pn'], row['outbound_version'], row['hours'],
                row['service_flow'], row['passing_station_method'], row['first_station_start_time'], row['data_source']
            ) for row in mapped_data]
            logging.info(f"Inserting {len(values)} rows into database...")
            execute_values(cursor, insert_query, values)
            conn.commit()
            logging.info(f"Inserted {len(values)} rows from {os.path.basename(file_path)}")
            cursor.close()
            file_imported = len(mapped_data)
            total_imported += file_imported
        except Exception as e:
            logging.error(f"Error importing {os.path.basename(file_path)}: {e}")
            conn.rollback()
            continue
    logging.info(f"\n📊 Total workstation records imported: {total_imported:,}")
    conn.close()
    logging.info('Script finished.')

if __name__ == "__main__":
    main() 