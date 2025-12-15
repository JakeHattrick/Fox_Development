import psycopg2
import pandas as pd
import glob
import os
from psycopg2.extras import execute_values
from datetime import timezone
<<<<<<< HEAD

def connect_to_db():
    print("Attempting to connect to database...")
    return psycopg2.connect(
        host="localhost",
        database="fox_db",
        user="gpu_user",
        password="",
        port="5432"
    )
=======
from config import DATABASE

def connect_to_db():
    print("Attempting to connect to database...")
    return psycopg2.connect(**DATABASE)
>>>>>>> origin/main

def create_snfn_table(conn):
    print("Creating/verifying snfn table...")
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS snfn_master_log (
        id SERIAL PRIMARY KEY,
        workstation_name VARCHAR(255) NOT NULL,
        fixture_no VARCHAR(255),
        error_code VARCHAR(255),
        error_disc TEXT,
        sn VARCHAR(255) NOT NULL,
        pn VARCHAR(255),
        history_station_start_time TIMESTAMP NOT NULL,
        history_station_end_time TIMESTAMP NOT NULL,
        data_source VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    try:
        cursor.execute("""
        ALTER TABLE snfn_master_log 
        ADD CONSTRAINT snfn_unique_constraint 
        UNIQUE (workstation_name, fixture_no, error_code, error_disc, sn, pn, history_station_start_time, history_station_end_time);
        """)
    except Exception as e:
        print(f"Note: Unique constraint may already exist: {e}")
    
    conn.commit()
    cursor.close()

def clean_column_name(col_name):
    cleaned = col_name.lower().replace(' ', '_').replace('-', '_')
    cleaned = ''.join(c for c in cleaned if c.isalnum() or c == '_')
    return cleaned

def convert_timestamp(value):
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    return pd.to_datetime(value)

def convert_empty_string(value):
    if isinstance(value, str) and value.strip() == '':
        return None
    return value

def main():
    print("Starting snfn data upload process...")
    
    try:
        conn = connect_to_db()
        print("Database connection successful")
    except Exception as e:
        print(f"Database connection failed: {e}")
        return
        
    create_snfn_table(conn)
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Script directory: {script_dir}")
    
    excel_path = os.path.join(script_dir, "input", "snfnrecord.xlsx")
    print(f"Looking for Excel files in: {excel_path}")
    
    excel_path_normalized = os.path.normpath(excel_path)
    print(f"Normalized path: {excel_path_normalized}")
    
    snfn_files = glob.glob(excel_path_normalized, recursive=True)
    print(f"Found {len(snfn_files)} Excel files")
    
    if not snfn_files:
        print("\nNo Excel files found! Checking directory existence:")
        check_path = os.path.join(script_dir, "input", "data log", "snfnrecord_xlsx")
        if os.path.exists(check_path):
            print(f"Directory exists: {check_path}")
            print("Contents:")
            for root, dirs, files in os.walk(check_path):
                print(f"\nDirectory: {root}")
                if dirs:
                    print("Subdirectories:", dirs)
                if files:
                    print("Files:", files)
        else:
            print(f"Directory does not exist: {check_path}")
        return
        
    total_imported = 0
    
    for i, file_path in enumerate(snfn_files, 1):
        print(f"\nProcessing file {i}/{len(snfn_files)}: {os.path.basename(file_path)}")
        
        try:
            print(f"Reading file: {file_path}")
            df = pd.read_excel(file_path)
            print(f"Successfully read file with {len(df)} rows")
            
            df.columns = [clean_column_name(col) for col in df.columns]
            
            mapped_data = []
            for _, row in df.iterrows():
                mapped_row = {
                    'workstation_name': convert_empty_string(str(row.get('workstation_name', ''))),
                    'fixture_no': convert_empty_string(str(row.get('fixture_no', ''))),
                    'error_code': convert_empty_string(str(row.get('error_code', ''))),
                    'error_disc': convert_empty_string(str(row.get('error_disc', ''))),
                    'sn': convert_empty_string(str(row.get('sn', ''))),
                    'pn': convert_empty_string(str(row.get('pn', ''))),
                    'history_station_start_time': convert_timestamp(row.get('history_station_start_time')),
                    'history_station_end_time': convert_timestamp(row.get('history_station_end_time')),
                    'data_source': 'snfn'
                }
                mapped_data.append(mapped_row)
            
            cursor = conn.cursor()
            
            insert_query = """
            INSERT INTO snfn_master_log (
                workstation_name, fixture_no, error_code, error_disc, sn, pn, history_station_start_time, history_station_end_time, data_source
            ) VALUES %s
            ON CONFLICT ON CONSTRAINT snfn_unique_constraint
            DO NOTHING
            """
            
            values = [(
                row['workstation_name'], row['fixture_no'], row['error_code'], row['error_disc'], row['sn'], row['pn'], row['history_station_start_time'], row['history_station_end_time'], row['data_source']
            ) for row in mapped_data]
            
            execute_values(cursor, insert_query, values)
            conn.commit()
            cursor.close()
            
            file_imported = len(mapped_data)
            total_imported += file_imported
            print(f"Imported {file_imported:,} records from {os.path.basename(file_path)}")
            
        except Exception as e:
            print(f"Error importing {os.path.basename(file_path)}: {e}")
            conn.rollback()
            continue
    
    print(f"\nTotal snfn records imported: {total_imported:,}")
    conn.close()

if __name__ == "__main__":
    main() 


