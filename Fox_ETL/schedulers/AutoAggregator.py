import subprocess
import time
from datetime import datetime
import logging
from pathlib import Path

class ScriptOrchestrator:
    def __init__(self):
        # Define base paths first
        self.scheduler_dir = Path(__file__).parent  # scheduler folder
        self.testboard_dir = self.scheduler_dir.parent / "aggregators" / "testboard_agg"
        self.workstation_dir = self.scheduler_dir.parent / "aggregators" / "workstation_agg"
        
        # Now setup logging after paths are defined
        self._setup_logging()
        
        # Rest of your initialization code...
        self.script_groups = {
            'testboard': [
                self.testboard_dir / 'aggregate_all_time_dedup.py',
                self.testboard_dir / 'aggregate_fixture_performance_all_time.py'
            ],
            'workstation': [
                self.workstation_dir / 'aggregate_packing_daily_dedup.py',
                self.workstation_dir / 'aggregate_packing_weekly_all_time_dedup.py',
                self.workstation_dir / 'aggregate_sort_test_all_time.py',
                self.workstation_dir / 'aggregate_sort_test_weekly_dedup.py',
                self.workstation_dir / 'aggregate_station_hourly_counts.py',
                self.workstation_dir / 'aggregate_tpy_all_time_daily.py',
                self.workstation_dir / 'aggregate_tpy_all_time_weekly.py'
            ]
        }
        
        # Verify all scripts exist
        self._verify_scripts()
        
        # Wait time between cycles (2 minutes = 120 seconds)
        self.wait_time = 120

    def _verify_scripts(self):
        """Verify all script paths exist before starting"""
        missing_scripts = []
        
        for category, scripts in self.script_groups.items():
            for script_path in scripts:
                if not script_path.exists():
                    missing_scripts.append(f"{category}: {script_path}")
        
        if missing_scripts:
            raise FileNotFoundError(
                "The following scripts were not found:\n" + 
                "\n".join(missing_scripts)
            )

    def _setup_logging(self):
        # Create logs directory if it doesn't exist
        log_dir = self.scheduler_dir / "logs"
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / "orchestrator.log"
        logging.basicConfig(
            filename=str(log_file),
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        # Also print to console
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        logging.getLogger().addHandler(console_handler)

    def run_script(self, script_path: Path, category: str) -> bool:
        try:
            logging.info(f"Starting {category} script: {script_path.name}")
            start_time = datetime.now()
            
            # Run the script in its own directory
            subprocess.run(
                ['python', str(script_path)],
                check=True,
                cwd=script_path.parent  # Set working directory to script's directory
            )
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            logging.info(f"Successfully completed {script_path.name}. Duration: {duration:.2f} seconds")
            return True
            
        except subprocess.CalledProcessError as e:
            logging.error(f"Error running {script_path.name}: {e}")
            return False
        except Exception as e:
            logging.error(f"Unexpected error running {script_path.name}: {e}")
            return False

    def run_cycle(self):
        cycle_start = datetime.now()
        logging.info("Starting new cycle")
        
        # First run testboard scripts
        logging.info("=== Starting Testboard Scripts ===")
        for script in self.script_groups['testboard']:
            success = self.run_script(script, 'testboard')
            if not success:
                logging.error(f"Cycle interrupted due to failure in testboard script: {script.name}")
                return False
        
        # Then run workstation scripts
        logging.info("=== Starting Workstation Scripts ===")
        for script in self.script_groups['workstation']:
            success = self.run_script(script, 'workstation')
            if not success:
                logging.error(f"Cycle interrupted due to failure in workstation script: {script.name}")
                return False
        
        cycle_end = datetime.now()
        duration = (cycle_end - cycle_start).total_seconds()
        logging.info(f"Cycle completed successfully. Total duration: {duration:.2f} seconds")
        return True

    def start(self):
        logging.info("Orchestrator starting")
        logging.info(f"Testboard directory: {self.testboard_dir}")
        logging.info(f"Workstation directory: {self.workstation_dir}")
        cycle_count = 1
        
        while True:
            try:
                logging.info(f"\n{'='*50}")
                logging.info(f"Starting cycle #{cycle_count}")
                logging.info(f"{'='*50}")
                
                self.run_cycle()
                
                logging.info(f"Waiting {self.wait_time} seconds before next cycle...")
                time.sleep(self.wait_time)
                
                cycle_count += 1
                
            except KeyboardInterrupt:
                logging.info("Orchestrator stopped by user")
                break
            except Exception as e:
                logging.error(f"Unexpected error in cycle: {e}")
                # Wait before trying again
                time.sleep(self.wait_time)

def main():
    orchestrator = ScriptOrchestrator()
    orchestrator.start()

if __name__ == "__main__":
    main()