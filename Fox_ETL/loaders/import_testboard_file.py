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
        print("Usage: python import_testboard_file.py /path/to/file.xlsx")
        sys.exit(1)
    file_path = sys.argv[1]
    if not os.path.isfile(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)
    print(f"Importing {file_path} into testboard_master_log...")
    conn = connect_to_db()
    try:
        df = pd.read_excel(file_path)
        df.columns = [clean_column_name(col) for col in df.columns]
        df['data_source'] = 'testboard'
        dedup_cols = [c for c in df.columns if c != 'number_of_times_baseboard_is_used']
        df = df.drop_duplicates(subset=dedup_cols)
        mapped_data = []
        for _, row in df.iterrows():
            val = row.get('number_of_times_baseboard_is_used')
            if pd.isna(val) or (isinstance(val, float) and math.isnan(val)):
                safe_number_of_times = None
            else:
                try:
                    safe_number_of_times = int(val)
                except Exception:
                    safe_number_of_times = None
            mapped_row = {
                'sn': str(row.get('sn', '')),
                'pn': str(row.get('pn', '')),
                'model': str(row.get('model', '')),
                'work_station_process': str(row.get('work_station_process', '')).strip() or None,
                'baseboard_sn': str(row.get('baseboard_sn', '')).strip() or None,
                'baseboard_pn': str(row.get('baseboard_pn', '')).strip() or None,
                'workstation_name': str(row.get('workstation_name', '')),
                'history_station_start_time': pd.to_datetime(row.get('history_station_start_time')).to_pydatetime(),
                'history_station_end_time': pd.to_datetime(row.get('history_station_end_time')).to_pydatetime(),
                'history_station_passing_status': str(row.get('history_station_passing_status', '')),
                'operator': str(row.get('operator', '')),
                'failure_reasons': str(row.get('failure_reasons', '')).strip() or None,
                'failure_note': str(row.get('failure_note', '')).strip() or None,
                'failure_code': str(row.get('failure_code', '')).strip() or None,
                'diag_version': str(row.get('diag_version', '')).strip() or None,
                'fixture_no': str(row.get('fixture_no', '')).strip() or None,
                'data_source': 'testboard'
            }
            mapped_data.append(mapped_row)
        cursor = conn.cursor()
        
        print(f"Checking for existing records to prevent duplicates...")
        existing_count = 0
        new_records = []
        
        for row in mapped_data:
            check_query = """
            SELECT COUNT(*) FROM testboard_master_log 
            WHERE sn = %s 
            AND pn = %s 
            AND model = %s 
            AND work_station_process = %s 
            AND baseboard_sn = %s 
            AND baseboard_pn = %s 
            AND workstation_name = %s 
            AND history_station_start_time = %s 
            AND history_station_end_time = %s 
            AND history_station_passing_status = %s 
            AND operator = %s 
            AND failure_reasons = %s 
            AND failure_note = %s 
            AND failure_code = %s 
            AND diag_version = %s 
            AND fixture_no = %s 
            AND data_source = %s
            """
            
            check_values = (
                row['sn'], row['pn'], row['model'], row['work_station_process'], 
                row['baseboard_sn'], row['baseboard_pn'], row['workstation_name'], 
                row['history_station_start_time'], row['history_station_end_time'], 
                row['history_station_passing_status'], row['operator'], row['failure_reasons'], 
                row['failure_note'], row['failure_code'], row['diag_version'], row['fixture_no'], row['data_source']
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
            INSERT INTO testboard_master_log (
                sn, pn, model, work_station_process, baseboard_sn, baseboard_pn, workstation_name,
                history_station_start_time, history_station_end_time, history_station_passing_status, operator,
                failure_reasons, failure_note, failure_code, diag_version, fixture_no, data_source
            ) VALUES %s
            """
            from psycopg2.extras import execute_values
            values = [(
                row['sn'], row['pn'], row['model'], row['work_station_process'], row['baseboard_sn'], row['baseboard_pn'], row['workstation_name'],
                row['history_station_start_time'], row['history_station_end_time'], row['history_station_passing_status'], row['operator'],
                row['failure_reasons'], row['failure_note'], row['failure_code'], row['diag_version'], row['fixture_no'], row['data_source']
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