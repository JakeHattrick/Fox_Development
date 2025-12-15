import os
import sys
import time
import subprocess
from datetime import datetime
import logging

<<<<<<< HEAD
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

INPUT_DIR = "/home/darvin/Fox_ETL/input"
=======
# Add the parent directory to the path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import PATHS

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

INPUT_DIR = PATHS['input_dir']
>>>>>>> origin/main

WORKSTATION_XLS_FILENAME = "workstationOutputReport.xls"
TESTBOARD_XLS_FILENAME = "Test board record report.xls"
SNFN_XLS_FILENAME = "snfnReport.xls"
WORKSTATION_FILEPATH = os.path.join(INPUT_DIR, WORKSTATION_XLS_FILENAME)
TESTBOARD_FILEPATH = os.path.join(INPUT_DIR, TESTBOARD_XLS_FILENAME)

SNFN_FILEPATH = os.path.join(INPUT_DIR, SNFN_XLS_FILENAME)

ETL_V2_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMPORT_TESTBOARD_SCRIPT = os.path.join(ETL_V2_DIR, "loaders", "import_testboard_file.py")
IMPORT_WORKSTATION_SCRIPT = os.path.join(ETL_V2_DIR, "loaders", "import_workstation_file.py")
IMPORT_SNFN_SCRIPT = os.path.join(ETL_V2_DIR, "loaders", "import_snfn_file.py")

def convert_xls_to_xlsx(xls_file_path):
    try:
        xlsx_file_path = os.path.splitext(xls_file_path)[0] + '.xlsx'
        
        logger.info(f"Converting {os.path.basename(xls_file_path)} to XLSX...")
        
        cmd = [
            'libreoffice',
            '--headless',
            '--convert-to', 'xlsx',
            '--outdir', os.path.dirname(xls_file_path),
            xls_file_path
        ]
        
        logger.info(f"Running command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            logger.info(f"Successfully converted to {os.path.basename(xlsx_file_path)}")
            return xlsx_file_path
        else:
            logger.error(f"LibreOffice conversion failed: {result.stderr}")
            return None
            
    except subprocess.TimeoutExpired:
        logger.error(f"LibreOffice conversion timed out for {os.path.basename(xls_file_path)}")
        return None
    except Exception as e:
        logger.error(f"Error converting {os.path.basename(xls_file_path)}: {e}")
        return None

def process_file(file_path, script_path, file_type):
    try:
<<<<<<< HEAD
        xlsx_file_path = convert_xls_to_xlsx(file_path)
        
        if not xlsx_file_path:
            logger.error(f"Failed to convert {os.path.basename(file_path)} to XLSX")
            return False
        
        if not os.path.exists(xlsx_file_path):
            logger.error(f"XLSX file not found after conversion: {os.path.basename(xlsx_file_path)}")
            return False

        try:
            os.remove(file_path)
            logger.info(f"Deleted original XLS file: {os.path.basename(file_path)}")
        except Exception as e:
            logger.warning(f"Could not delete original XLS file: {e}")
        
        logger.info(f"Importing {file_type} data using {os.path.basename(script_path)}...")
        
        cmd = ['python3', script_path, xlsx_file_path]
=======
        # Check if file is already XLSX
        if file_path.lower().endswith('.xlsx'):
            xlsx_file_path = file_path
            logger.info(f"File is already XLSX: {os.path.basename(file_path)}")
        else:
            # Convert XLS to XLSX
            xlsx_file_path = convert_xls_to_xlsx(file_path)
            
            if not xlsx_file_path:
                logger.error(f"Failed to convert {os.path.basename(file_path)} to XLSX")
                return False
            
            if not os.path.exists(xlsx_file_path):
                logger.error(f"XLSX file not found after conversion: {os.path.basename(xlsx_file_path)}")
                return False

            try:
                os.remove(file_path)
                logger.info(f"Deleted original XLS file: {os.path.basename(file_path)}")
            except Exception as e:
                logger.warning(f"Could not delete original XLS file: {e}")
        
        logger.info(f"Importing {file_type} data using {os.path.basename(script_path)}...")
        
        # Use relative path so the script runs correctly from the Fox_ETL directory
        script_name = os.path.basename(script_path)
        cmd = ['python3', f'loaders/{script_name}', xlsx_file_path]
>>>>>>> origin/main
        logger.info(f"Running command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
<<<<<<< HEAD
            timeout=300
=======
            timeout=300,
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
>>>>>>> origin/main
        )
        
        if result.returncode == 0:
            logger.info(f"Successfully imported {file_type} data")
            logger.info(f"Output: {result.stdout}")
            return True
        else:
            logger.error(f"Import script failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error(f"Import script timed out for {file_type}")
        return False
    except Exception as e:
        logger.error(f"Error processing {file_type}: {e}")
        return False

def monitor_for_files():
    logger.info("Starting file monitor for PostgreSQL ETL pipeline")
    logger.info(f"Monitoring directory: {INPUT_DIR}")
    logger.info(f"Target files: {WORKSTATION_XLS_FILENAME}, {TESTBOARD_XLS_FILENAME},{SNFN_XLS_FILENAME}")
    logger.info(f"Import scripts: {os.path.basename(IMPORT_WORKSTATION_SCRIPT)}, {os.path.basename(IMPORT_TESTBOARD_SCRIPT)}, {os.path.basename(IMPORT_SNFN_SCRIPT)}")
    
    while True:
        try:
<<<<<<< HEAD
            if os.path.exists(WORKSTATION_FILEPATH):
=======
            # Check for workstation file (XLS or XLSX)
            workstation_xls = os.path.join(INPUT_DIR, WORKSTATION_XLS_FILENAME)
            workstation_xlsx = os.path.join(INPUT_DIR, WORKSTATION_XLS_FILENAME.replace('.xls', '.xlsx'))
            
            if os.path.exists(workstation_xls):
>>>>>>> origin/main
                logger.info(f"Workstation file detected: {WORKSTATION_XLS_FILENAME} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"Starting workstation file processing pipeline...")
                
                success = process_file(
<<<<<<< HEAD
                    WORKSTATION_FILEPATH, 
=======
                    workstation_xls, 
                    IMPORT_WORKSTATION_SCRIPT, 
                    "workstation"
                )
                
                if success:
                    logger.info(f"Workstation file processing completed successfully")
                else:
                    logger.error(f"Workstation file processing failed")
            elif os.path.exists(workstation_xlsx):
                logger.info(f"Workstation file detected: {os.path.basename(workstation_xlsx)} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"Starting workstation file processing pipeline...")
                
                success = process_file(
                    workstation_xlsx, 
>>>>>>> origin/main
                    IMPORT_WORKSTATION_SCRIPT, 
                    "workstation"
                )
                
                if success:
                    logger.info(f"Workstation file processing completed successfully")
                else:
                    logger.error(f"Workstation file processing failed")
            
<<<<<<< HEAD
            if os.path.exists(TESTBOARD_FILEPATH):
=======
            # Check for testboard file (XLS or XLSX)
            testboard_xls = os.path.join(INPUT_DIR, TESTBOARD_XLS_FILENAME)
            testboard_xlsx = os.path.join(INPUT_DIR, TESTBOARD_XLS_FILENAME.replace('.xls', '.xlsx'))
            
            if os.path.exists(testboard_xls):
>>>>>>> origin/main
                logger.info(f"Test board file detected: {TESTBOARD_XLS_FILENAME} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"Starting test board file processing pipeline...")
                
                success = process_file(
<<<<<<< HEAD
                    TESTBOARD_FILEPATH, 
=======
                    testboard_xls, 
                    IMPORT_TESTBOARD_SCRIPT, 
                    "testboard"
                )
                
                if success:
                    logger.info(f"Test board file processing completed successfully")
                else:
                    logger.error(f"❌ STEP 3: Test board file processing failed")
            elif os.path.exists(testboard_xlsx):
                logger.info(f"Test board file detected: {os.path.basename(testboard_xlsx)} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"Starting test board file processing pipeline...")
                
                success = process_file(
                    testboard_xlsx, 
>>>>>>> origin/main
                    IMPORT_TESTBOARD_SCRIPT, 
                    "testboard"
                )
                
                if success:
                    logger.info(f"Test board file processing completed successfully")
                else:
                    logger.error(f"❌ STEP 3: Test board file processing failed")

<<<<<<< HEAD
            # Check for snfn report
            if os.path.exists(SNFN_FILEPATH):
=======
            # Check for snfn report (XLS or XLSX)
            snfn_xls = os.path.join(INPUT_DIR, SNFN_XLS_FILENAME)
            snfn_xlsx = os.path.join(INPUT_DIR, SNFN_XLS_FILENAME.replace('.xls', '.xlsx'))
            
            if os.path.exists(snfn_xls):
>>>>>>> origin/main
                logger.info(f"📋 STEP 1: SnfN file detected: {SNFN_XLS_FILENAME} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"🔄 STEP 2: Starting SnFn file processing pipeline...")
                
                success = process_file(
<<<<<<< HEAD
                    SNFN_FILEPATH, 
=======
                    snfn_xls, 
                    IMPORT_SNFN_SCRIPT, 
                    "snfn"
                )
                
                if success:
                    logger.info(f"✅ STEP 3: snfn file processing completed successfully")
                else:
                    logger.error(f"❌ STEP 3: snfn file processing failed")
            elif os.path.exists(snfn_xlsx):
                logger.info(f"📋 STEP 1: SnfN file detected: {os.path.basename(snfn_xlsx)} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"🔄 STEP 2: Starting SnFn file processing pipeline...")
                
                success = process_file(
                    snfn_xlsx, 
>>>>>>> origin/main
                    IMPORT_SNFN_SCRIPT, 
                    "snfn"
                )
                
                if success:
                    logger.info(f"✅ STEP 3: snfn file processing completed successfully")
                else:
                    logger.error(f"❌ STEP 3: snfn file processing failed")
                
            time.sleep(10)  # Check every 10 seconds
            
        except KeyboardInterrupt:
            logger.info("File monitor shutdown requested")
            break
        except Exception as e:
            logger.error(f"Error in monitor loop: {e}")
            import traceback
            logger.error(traceback.format_exc())
            time.sleep(10)


if __name__ == "__main__":
    monitor_for_files() 