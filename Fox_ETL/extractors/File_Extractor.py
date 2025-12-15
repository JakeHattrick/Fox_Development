from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os
import shutil
from pathlib import Path
import logging
<<<<<<< HEAD
=======
import sys

# Import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import PATHS
>>>>>>> origin/main

logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def setup_driver():
    try:
        driver = webdriver.Chrome()
        return driver
    except Exception as e:
        logger.error(f"Error setting up Chrome driver: {e}")
        return None

def monitor_and_move_file(filename):
<<<<<<< HEAD
    downloads_path = "/home/darvin/Downloads"
    target_path = "/home/darvin/Fox_ETL/input"
=======
    downloads_path = PATHS['downloads_dir']
    target_path = PATHS['input_dir']
>>>>>>> origin/main

    source_file = os.path.join(downloads_path, filename)
    target_file = os.path.join(target_path, filename)

    try:
        if os.path.exists(source_file):
            shutil.move(source_file, target_file)
            logger.info(f"File moved to processing queue: {filename}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error moving file from {source_file} to {target_file}: {e}")
        return False

def wait_for_download(filename, timeout=60):
<<<<<<< HEAD
    downloads_path = "/home/darvin/Downloads"
=======
    downloads_path = PATHS['downloads_dir']
>>>>>>> origin/main
    file_path = os.path.join(downloads_path, filename)
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if os.path.exists(file_path):
            time.sleep(2)
            return True
        time.sleep(1)
    return False

def main():
    driver = setup_driver()
    if driver:
        try:
            driver.get("https://wareconn.com/r/Summary/pctls")
            input("Login and configure BOTH forms in two tabs, then press Enter to start auto-submit...\n\nTab 1: workstationOutputReport.xls\nTab 2: Test board record report.xls\n\nMake sure both tabs are ready and on the correct form page.")

            driver.execute_script("window.open('https://wareconn.com/r/Summary/pctls', '_blank');")
            time.sleep(2)
            tabs = driver.window_handles
            tab1 = tabs[0]
            tab2 = tabs[1]

            driver.switch_to.window(tab2)
            input("Configure the second tab for 'Test board record report.xls', then press Enter to continue...")
            driver.switch_to.window(tab1)

            workstation_filename = "workstationOutputReport.xls"
            testboard_filename = "Test board record report.xls"

            while True:
                driver.switch_to.window(tab1)
                try:
                    confirm_button1 = WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable((By.XPATH, "//span[normalize-space(text())='confirm']"))
                    )
                    confirm_button1.click()
                    logger.info("Clicked confirm on Tab 1 (workstation report)")
                    
                    if wait_for_download(workstation_filename):
                        logger.info("Workstation file download completed")
                        monitor_and_move_file(workstation_filename)
                    else:
                        logger.error("Workstation file download timed out")
                        
                except Exception as e:
                    logger.error(f"Could not click confirm button on Tab 1: {e}")

                driver.switch_to.window(tab2)
                try:
                    confirm_button2 = WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable((By.XPATH, "//span[normalize-space(text())='confirm']"))
                    )
                    confirm_button2.click()
                    logger.info("Clicked confirm on Tab 2 (test board report)")
                    
                    if wait_for_download(testboard_filename):
                        logger.info("Testboard file download completed")
                        monitor_and_move_file(testboard_filename)
                    else:
                        logger.error("Testboard file download timed out")
                        
                except Exception as e:
                    logger.error(f"Could not click confirm button on Tab 2: {e}")

                driver.switch_to.window(tab1)
                time.sleep(120)  

        except Exception as e:
            logger.error(f"Error during extraction process: {e}")
        finally:
            driver.quit()

if __name__ == "__main__":
    main() 