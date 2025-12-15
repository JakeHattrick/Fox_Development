#!/usr/bin/env python3
"""
Import a single snfn Excel file into snfn_master_log.
Usage: python import_snfn_file.py /path/to/file.xlsx
"""
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
        print("Usage: python import_snfn_file.py /path/to/file.xlsx")
        sys.exit(1)
    file_path = sys.argv[1]
    if not os.path.isfile(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)
    print(f"📥 Importing {file_path} into snfn_master_log...")
    conn = connect_to_db()
    try:
        df = pd.read_excel(file_path)
        df.columns = [clean_column_name(col) for col in df.columns]
        df['data_source'] = 'snfn'
        dedup_cols = [c for c in df.columns if c != 'number_of_times_baseboard_is_used']
        df = df.drop_duplicates(subset=dedup_cols)
        mapped_data = []
        for _, row in df.iterrows():
            mapped_row = {
                'workstation_name': str(row.get('workstation_name', '')),
                'fixture_no': str(row.get('fixture_no', '')).strip() or None,
                'error_code': str(row.get('error_code', '')).strip() or None,
                'error_disc': str(row.get('error_disc', '')).strip() or None,
                'model': str(row.get('model', '')).strip() or None,
                'sn': str(row.get('sn', '')),
                'pn': str(row.get('pn', '')),
                'history_station_start_time': pd.to_datetime(row.get('history_station_start_time')).to_pydatetime(),
                'history_station_end_time': pd.to_datetime(row.get('history_station_end_time')).to_pydatetime(),
                'data_source': 'snfn'
            }
            mapped_data.append(mapped_row)
        cursor = conn.cursor()
        
        # Check for existing records to avoid duplicates (excluding 'number_of_times_baseboard_is_used' column)
        print(f"🔍 Checking for existing records to prevent duplicates...")
        existing_count = 0
        new_records = []
        
        for row in mapped_data:
            # Create a check query using only the actual snfn columns (no number_of_times_baseboard_is_used column)
            check_query = """
            SELECT COUNT(*) FROM snfn_master_log 
            WHERE 
            workstation_name = %s
            AND fixture_no = %s
            AND error_code = %s
            AND error_disc = %s
            And model = %s
            AND sn = %s
            AND pn = %s
            AND history_station_start_time = %s
            AND history_station_end_time = %s
            AND data_source = %s
            """
            
            check_values = (
                 row['workstation_name'], row['fixture_no'], row['error_code'], row['error_disc'],  row['sn'], row['pn'], row['model'], row['history_station_start_time'], row['history_station_end_time'], row['data_source']
            )
            
            cursor.execute(check_query, check_values)
            exists = cursor.fetchone()[0]
            
            if exists > 0:
                existing_count += 1
            else:
                new_records.append(row)
        
        print(f"📊 Found {existing_count:,} existing records, {len(new_records):,} new records to insert")
        
        if new_records:
            insert_query = """
            INSERT INTO snfn_master_log (
                workstation_name, fixture_no, error_code, error_disc, sn, pn, model, history_station_start_time, history_station_end_time, data_source
            ) VALUES %s
            ON CONFLICT DO NOTHING
            """
            from psycopg2.extras import execute_values
            values = [(
                row['workstation_name'], row['fixture_no'], row['error_code'], row['error_disc'], row['sn'], row['pn'], row['model'], row['history_station_start_time'], row['history_station_end_time'], row['data_source']
            ) for row in new_records]
            execute_values(cursor, insert_query, values)
            conn.commit()
            print(f"✅ Imported {len(new_records):,} new records from {os.path.basename(file_path)}")
        else:
            print(f"✅ No new records to import (all {existing_count:,} records already exist)")
        
        cursor.close()
        
        # Clean up the XLSX file after successful import
        try:
            os.remove(file_path)
            print(f"🗑️ Deleted XLSX file: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"⚠️ Could not delete XLSX file: {e}")
            
    except Exception as e:
        print(f"❌ Error importing {os.path.basename(file_path)}: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main() 