import sys
import os
import pandas as pd
import psycopg2
import math

<<<<<<< HEAD
def connect_to_db():
    return psycopg2.connect(
        host="localhost",
        database="fox_db",
        user="gpu_user",
        password="",
        port="5432"
    )
=======
# Add the parent directory to the path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE

def connect_to_db():
    return psycopg2.connect(**DATABASE)
>>>>>>> origin/main

def clean_column_name(col_name):
    return col_name.lower().replace(' ', '_').replace('-', '_')

def main():
    if len(sys.argv) != 2:
        print("Usage: python import_workstation_file.py /path/to/file.xlsx")
        sys.exit(1)
    file_path = sys.argv[1]
    if not os.path.isfile(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)
    print(f"Importing {file_path} into workstation_master_log...")
    conn = connect_to_db()
    try:
        df = pd.read_excel(file_path)
        df.columns = [clean_column_name(col) for col in df.columns]
        df['data_source'] = 'workstation'
<<<<<<< HEAD
        dedup_cols = [c for c in df.columns if c != 'day']
        df = df.drop_duplicates(subset=dedup_cols)
=======
        
        # Clean duplicates while ignoring 'day' and 'tat' columns
        # These are metadata columns that shouldn't be used for duplicate detection
        dedup_cols = [c for c in df.columns if c not in ['day', 'tat']]
        original_count = len(df)
        df = df.drop_duplicates(subset=dedup_cols)
        cleaned_count = len(df)
        
        if original_count != cleaned_count:
            print(f"Cleaned {original_count - cleaned_count:,} duplicate rows (ignoring 'day' and 'tat' columns)")
            print(f"Original rows: {original_count:,}, Cleaned rows: {cleaned_count:,}")
>>>>>>> origin/main
        mapped_data = []
        for _, row in df.iterrows():
            mapped_row = {
                'sn': str(row.get('sn', '')),
                'pn': str(row.get('pn', '')),
                'customer_pn': str(row.get('customer_pn', '')).strip() or None,
                'outbound_version': str(row.get('outbound_version', '')),
                'workstation_name': str(row.get('workstation_name', '')),
                'history_station_start_time': pd.to_datetime(row.get('history_station_end_time')).to_pydatetime() if pd.isna(row.get('history_station_start_time')) else pd.to_datetime(row.get('history_station_start_time')).to_pydatetime() if pd.notna(row.get('history_station_start_time')) else None,
                'history_station_end_time': pd.to_datetime(row.get('history_station_end_time')).to_pydatetime() if pd.notna(row.get('history_station_end_time')) else None,
                'hours': str(row.get('hours', '')),
                'service_flow': str(row.get('service_flow', '')),
                'model': str(row.get('model', '')),
                'history_station_passing_status': str(row.get('history_station_passing_status', '')),
                'passing_station_method': str(row.get('passing_station_method', '')),
                'operator': str(row.get('operator', '')),
                'first_station_start_time': pd.to_datetime(row.get('first_station_start_time')).to_pydatetime() if pd.notna(row.get('first_station_start_time')) else None,
                'data_source': 'workstation'
            }
            mapped_data.append(mapped_row)
        cursor = conn.cursor()
        
        print(f"Checking for existing records to prevent duplicates...")
        existing_count = 0
        new_records = []
        
        for row in mapped_data:
            check_query = """
            SELECT COUNT(*) FROM workstation_master_log 
            WHERE sn = %s 
            AND pn = %s 
            AND customer_pn = %s 
            AND outbound_version = %s 
            AND workstation_name = %s 
            AND history_station_start_time = %s 
            AND history_station_end_time = %s 
            AND hours = %s 
            AND service_flow = %s 
            AND model = %s 
            AND history_station_passing_status = %s 
            AND passing_station_method = %s 
            AND operator = %s 
            AND first_station_start_time = %s 
            AND data_source = %s
            """
            
            check_values = (
                row['sn'], row['pn'], row['customer_pn'], row['outbound_version'], 
                row['workstation_name'], row['history_station_start_time'], row['history_station_end_time'], 
                row['hours'], row['service_flow'], row['model'], row['history_station_passing_status'], 
                row['passing_station_method'], row['operator'], row['first_station_start_time'], row['data_source']
            )
            
            cursor.execute(check_query, check_values)
            exists = cursor.fetchone()[0]
            
            if exists > 0:
                existing_count += 1
            else:
                new_records.append(row)
        
        print(f"Found {existing_count:,} existing records, {len(new_records):,} new records to insert")
        
        if new_records:
            insert_query = """
            INSERT INTO workstation_master_log (
                sn, pn, customer_pn, outbound_version, workstation_name,
                history_station_start_time, history_station_end_time, hours, service_flow, model,
                history_station_passing_status, passing_station_method, operator, first_station_start_time, data_source
            ) VALUES %s
            """
            from psycopg2.extras import execute_values
            values = [(
                row['sn'], row['pn'], row['customer_pn'], row['outbound_version'], row['workstation_name'],
                row['history_station_start_time'], row['history_station_end_time'], row['hours'], row['service_flow'], row['model'],
                row['history_station_passing_status'], row['passing_station_method'], row['operator'], row['first_station_start_time'], row['data_source']
            ) for row in new_records]
            execute_values(cursor, insert_query, values)
            conn.commit()
            print(f"Imported {len(new_records):,} new records from {os.path.basename(file_path)}")
        else:
            print(f"No new records to import (all {existing_count:,} records already exist)")
        
        cursor.close()
        
        try:
            os.remove(file_path)
            print(f"Deleted XLSX file: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"Could not delete XLSX file: {e}")
            
    except Exception as e:
        print(f"Error importing {os.path.basename(file_path)}: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main() 