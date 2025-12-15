import psycopg2
import json
from datetime import datetime, timedelta
import argparse
<<<<<<< HEAD

DB_CONFIG = {
    'host': 'localhost',
    'database': 'fox_db',
    'user': 'gpu_user',
    'password': '',
    'port': '5432'
}
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

def get_week_bounds(target_date):
    """Get the Monday (start) and Sunday (end) of the week containing target_date"""
    days_since_monday = target_date.weekday()
    week_start = target_date - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=6)
    return week_start, week_end

def get_week_id(target_date):
    """Generate week ID like '2025-W22' for the week containing target_date"""
    year, week_num, _ = target_date.isocalendar()
    return f"{year}-W{week_num:02d}"

def calculate_weekly_starters_for_date(target_date):
    """Get all parts that STARTED during the week containing target_date"""
    week_start, week_end = get_week_bounds(target_date)
    week_id = get_week_id(target_date)
    
    print(f"Week {week_id}: {week_start.strftime('%Y-%m-%d')} to {week_end.strftime('%Y-%m-%d')}")
    
<<<<<<< HEAD
    conn = psycopg2.connect(**DB_CONFIG)
=======
    conn = psycopg2.connect(**DATABASE)
>>>>>>> origin/main
    try:
        with conn.cursor() as cur:
            start_date = week_start
            end_date = week_end + timedelta(days=1)  
            
            cur.execute("""
                WITH first_activity AS (
                    SELECT 
                        sn,
                        model,
                        MIN(history_station_end_time) as first_activity_time
                    FROM workstation_master_log
                    WHERE service_flow NOT IN ('NC Sort', 'RO')
                        AND service_flow IS NOT NULL
                    GROUP BY sn, model
                )
                SELECT 
                    model,
                    COUNT(*) as count,
                    ARRAY_AGG(sn) as parts
                FROM first_activity
                WHERE first_activity_time >= %s 
                    AND first_activity_time < %s
                GROUP BY model
                ORDER BY model;
            """, (start_date, end_date))
            
            results = cur.fetchall()
            
            total_starters = 0
            week_starters = []
            by_model = {}
            
            for model, count, parts in results:
                total_starters += count
                week_starters.extend(parts)
                by_model[model] = count
                print(f"    {model}: {count} parts")
            
            print(f"Week starters: {total_starters} parts")
            
            return {
                "weekId": week_id,
                "weekStart": week_start,
                "weekEnd": week_end,
                "totalStarters": total_starters,
                "weekStarters": week_starters,
                "byModel": by_model
            }
    finally:
        conn.close()

def calculate_daily_completions_from_week_starters(target_date, week_starters_list):
    """Of the parts that started this week, how many completed on target_date?"""
    start_date = target_date
    end_date = target_date + timedelta(days=1)
    
    print(f"Daily completions on {target_date.strftime('%Y-%m-%d')} from week starters...")
    
<<<<<<< HEAD
    conn = psycopg2.connect(**DB_CONFIG)
=======
    conn = psycopg2.connect(**DATABASE)
>>>>>>> origin/main
    try:
        with conn.cursor() as cur:
            if not week_starters_list:
                print(f"No week starters to check")
                return {
                    "completedToday": 0,
                    "firstPassToday": 0,
                    "dailyFPY": 0.0,
                    "byModel": {}
                }
            
            cur.execute("""
                WITH completion_check AS (
                    SELECT 
                        sn,
                        model,
                        COUNT(CASE WHEN workstation_name = 'PACKING' THEN 1 END) as reached_packing,
                        COUNT(CASE WHEN history_station_passing_status != 'Pass' THEN 1 END) as failure_count
                    FROM workstation_master_log
                    WHERE sn = ANY(%s)
                        AND history_station_end_time >= %s 
                        AND history_station_end_time < %s
                        AND service_flow NOT IN ('NC Sort', 'RO')
                        AND service_flow IS NOT NULL
                    GROUP BY sn, model
                )
                SELECT 
                    model,
                    COUNT(*) as completed_today,
                    COUNT(CASE WHEN reached_packing > 0 AND failure_count = 0 THEN 1 END) as first_pass_today
                FROM completion_check
                WHERE reached_packing > 0
                GROUP BY model;
            """, (week_starters_list, start_date, end_date))
            
            results = cur.fetchall()
            
            completed_today = 0
            first_pass_today = 0
            by_model = {}
            
            for model, completed, first_pass in results:
                completed_today += completed
                first_pass_today += first_pass
                by_model[model] = {"completed": completed, "firstPass": first_pass}
            
            daily_fpy = (first_pass_today / completed_today * 100) if completed_today > 0 else 0
            
            print(f"Completed today: {completed_today} parts")
            print(f"First pass today: {first_pass_today} parts ({daily_fpy:.2f}% FPY)")
            
            for model, counts in by_model.items():
                model_fpy = (counts['firstPass'] / counts['completed'] * 100) if counts['completed'] > 0 else 0
                print(f"    {model}: {counts['firstPass']}/{counts['completed']} = {model_fpy:.1f}% FPY")
            
            return {
                "completedToday": completed_today,
                "firstPassToday": first_pass_today,
                "dailyFPY": round(daily_fpy, 2),
                "byModel": by_model
            }
    finally:
        conn.close()

def aggregate_daily_tpy_for_date(target_date):
    """Aggregate daily TPY metrics for a specific date"""
    print(f"\nAGGREGATING DAILY TPY FOR: {target_date.strftime('%Y-%m-%d')}")
    print("=" * 60)
    
<<<<<<< HEAD
    conn = psycopg2.connect(**DB_CONFIG)
=======
    conn = psycopg2.connect(**DATABASE)
>>>>>>> origin/main
    try:
        with conn.cursor() as cur:
            week_data = calculate_weekly_starters_for_date(target_date)
            
            daily_completions = calculate_daily_completions_from_week_starters(
                target_date, 
                week_data['weekStarters']
            )
            
            start_date = target_date
            end_date = target_date + timedelta(days=1)
            
            cur.execute("""
                SELECT 
                    model,
                    workstation_name,
                    COUNT(*) as total_parts,
                    COUNT(CASE WHEN history_station_passing_status = 'Pass' THEN 1 END) as passed_parts,
                    COUNT(CASE WHEN history_station_passing_status != 'Pass' THEN 1 END) as failed_parts
                FROM workstation_master_log 
                WHERE history_station_end_time >= %s 
                    AND history_station_end_time < %s
                    AND service_flow NOT IN ('NC Sort', 'RO')
                    AND service_flow IS NOT NULL
                    AND (model IN ('Tesla SXM4', 'Tesla SXM5') OR model = 'SXM6')
                GROUP BY model, workstation_name
                HAVING COUNT(*) >= 1
                ORDER BY model, total_parts DESC;
            """, (start_date, end_date))
            
            results = cur.fetchall()
            
            inserted_count = 0
            for model, workstation, total, passed, failed in results:
                throughput_yield = (passed / total * 100) if total > 0 else 0
                
                cur.execute("""
                    INSERT INTO daily_tpy_metrics 
                        (date_id, model, workstation_name, total_parts, passed_parts, failed_parts, throughput_yield,
                         week_id, week_start, week_end, total_starters)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (date_id, model, workstation_name) 
                    DO UPDATE SET
                        total_parts = EXCLUDED.total_parts,
                        passed_parts = EXCLUDED.passed_parts,
                        failed_parts = EXCLUDED.failed_parts,
                        throughput_yield = EXCLUDED.throughput_yield,
                        week_id = EXCLUDED.week_id,
                        week_start = EXCLUDED.week_start,
                        week_end = EXCLUDED.week_end,
                        total_starters = EXCLUDED.total_starters,
                        created_at = NOW();
                """, (target_date, model, workstation, total, passed, failed, round(throughput_yield, 2),
                      week_data['weekId'], week_data['weekStart'], week_data['weekEnd'], week_data['totalStarters']))
                
                inserted_count += 1
                print(f"    {model} {workstation}: {passed}/{total} = {throughput_yield:.1f}%")
            
            conn.commit()
            
            print(f"\nDaily TPY aggregation complete!")
            print(f"  Inserted/Updated {inserted_count} station-model combinations")
            print(f"  Daily FPY: {daily_completions['dailyFPY']:.1f}%")
            print(f"  Date: {target_date.strftime('%Y-%m-%d')}")
            
            return {
                "date": target_date,
                "insertedCount": inserted_count,
                "dailyFPY": daily_completions['dailyFPY'],
                "completedToday": daily_completions['completedToday'],
                "weekData": week_data
            }
            
    finally:
        conn.close()

def get_all_available_dates():
    """Get all unique dates when actual testing occurred"""
    print("Finding all dates with actual test activity...")
    
<<<<<<< HEAD
    conn = psycopg2.connect(**DB_CONFIG)
=======
    conn = psycopg2.connect(**DATABASE)
>>>>>>> origin/main
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT DATE(history_station_end_time) as test_date
                FROM workstation_master_log
                WHERE history_station_end_time IS NOT NULL
                    AND service_flow NOT IN ('NC Sort', 'RO')
                    AND service_flow IS NOT NULL
                ORDER BY test_date;
            """)
            
            dates = [row[0] for row in cur.fetchall()]
            print(f"  Found {len(dates)} dates with test activity from {dates[0]} to {dates[-1]}")
            return dates
    finally:
        conn.close()

def aggregate_daily_tpy_metrics_all_time():
    """Aggregate daily TPY metrics for all historical dates"""
    print("DAILY TPY METRICS ALL-TIME AGGREGATOR")
    print("=" * 50)
    
    # Get all available dates
    all_dates = get_all_available_dates()
    
    if not all_dates:
        print("No valid dates found in the dataset")
        return
    
    print(f"\nProcessing ALL {len(all_dates)} historical dates...")
    
    success_count = 0
    error_count = 0
    
    for i, target_date in enumerate(all_dates, 1):
        try:
            print(f"\nProcessing {i}/{len(all_dates)}: {target_date.strftime('%Y-%m-%d')}")
            print("-" * 50)
            
            result = aggregate_daily_tpy_for_date(target_date)
            success_count += 1
            
        except Exception as e:
            print(f"ERROR processing {target_date.strftime('%Y-%m-%d')}: {str(e)}")
            error_count += 1
    
    print(f"\nDAILY TPY ALL-TIME AGGREGATION COMPLETE!")
    print(f"Successfully processed: {success_count} dates")
    print(f"Errors: {error_count} dates")
    
    # Show sample results
<<<<<<< HEAD
    conn = psycopg2.connect(**DB_CONFIG)
=======
    conn = psycopg2.connect(**DATABASE)
>>>>>>> origin/main
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM daily_tpy_metrics")
            total_records = cur.fetchone()[0]
            print(f"Total records in daily_tpy_metrics: {total_records}")
            
            if total_records > 0:
                cur.execute("""
                    SELECT date_id, model, workstation_name, throughput_yield 
                    FROM daily_tpy_metrics 
                    ORDER BY date_id DESC, throughput_yield DESC 
                    LIMIT 5;
                """)
                sample_results = cur.fetchall()
                print(f"\nSAMPLE RESULTS:")
                for date_id, model, station, yield_pct in sample_results:
                    print(f"  {date_id} {model} {station}: {yield_pct:.1f}%")
    finally:
        conn.close()

if __name__ == "__main__":
    aggregate_daily_tpy_metrics_all_time() 