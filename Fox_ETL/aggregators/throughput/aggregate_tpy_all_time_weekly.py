#!/usr/bin/env python3
import psycopg2
import json
from datetime import datetime, timedelta
import argparse
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

def get_week_date_range(week_id):
    """Get start and end dates for an ISO week"""
    year, week = week_id.split('-W')
    year = int(year)
    week = int(week)
    
    # ISO week 1 is the first week with Thursday in the new year
    jan4 = datetime(year, 1, 4)
    week_start = jan4 - timedelta(days=jan4.weekday()) + timedelta(weeks=week-1)
    week_end = week_start + timedelta(days=6)
    
    return week_start.date(), week_end.date()

def calculate_weekly_first_pass_yield_from_raw(week_start, week_end):
    """Calculate WEEKLY first pass yield using raw data"""
    conn = psycopg2.connect(**DATABASE)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                WITH part_analysis AS (
                    SELECT 
                        sn,
                        model,
                        COUNT(CASE WHEN workstation_name = 'PACKING' THEN 1 END) as reached_packing,
                        COUNT(CASE WHEN history_station_passing_status != 'Pass' THEN 1 END) as failure_count
                    FROM workstation_master_log
                    WHERE history_station_end_time >= %s 
                        AND history_station_end_time < %s
                        AND service_flow NOT IN ('NC Sort', 'RO')
                        AND service_flow IS NOT NULL
                    GROUP BY sn, model
                )
                SELECT 
                    COUNT(*) as parts_started,
                    COUNT(CASE WHEN reached_packing > 0 AND failure_count = 0 THEN 1 END) as first_pass_success,
                    COUNT(CASE WHEN reached_packing > 0 THEN 1 END) as parts_completed,
                    COUNT(CASE WHEN failure_count > 0 THEN 1 END) as parts_failed,
                    COUNT(CASE WHEN reached_packing = 0 AND failure_count = 0 THEN 1 END) as parts_stuck_in_limbo
                FROM part_analysis;
            """, (week_start, week_end + timedelta(days=1)))
            
            result = cur.fetchone()
            if result and result[0] > 0:
                parts_started, first_pass_success, parts_completed, parts_failed, parts_stuck = result
                traditional_fpy = (first_pass_success / parts_started * 100) if parts_started > 0 else 0
                active_parts = parts_completed + parts_failed
                completed_only_fpy = (first_pass_success / active_parts * 100) if active_parts > 0 else 0
                
                return {
                    "traditional": {
                        "partsStarted": parts_started,
                        "firstPassSuccess": first_pass_success,
                        "firstPassYield": round(traditional_fpy, 2)
                    },
                    "completedOnly": {
                        "activeParts": active_parts,
                        "firstPassSuccess": first_pass_success,
                        "firstPassYield": round(completed_only_fpy, 2)
                    },
                    "breakdown": {
                        "partsCompleted": parts_completed,
                        "partsFailed": parts_failed,
                        "partsStuckInLimbo": parts_stuck,
                        "totalParts": parts_started
                    }
                }
            else:
                return {
                    "traditional": {"partsStarted": 0, "firstPassSuccess": 0, "firstPassYield": 0},
                    "completedOnly": {"activeParts": 0, "firstPassSuccess": 0, "firstPassYield": 0},
                    "breakdown": {"partsCompleted": 0, "partsFailed": 0, "partsStuckInLimbo": 0, "totalParts": 0}
                }
    finally:
        conn.close()

def calculate_model_specific_throughput_yields(week_start, week_end):
    """Calculate MODEL-SPECIFIC throughput yields from raw data"""
    conn = psycopg2.connect(**DATABASE)
    try:
        with conn.cursor() as cur:
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
            """, (week_start, week_end + timedelta(days=1)))
            
            results = cur.fetchall()
            model_specific_yields = {"overall": {}}
            
            for model, station, total, passed, failed in results:
                throughput_yield = (passed / total * 100) if total > 0 else 0
                
                if model not in model_specific_yields:
                    model_specific_yields[model] = {}
                
                model_specific_yields[model][station] = {
                    "totalParts": total,
                    "passedParts": passed,
                    "failedParts": failed,
                    "throughputYield": round(throughput_yield, 2)
                }
                
                if station not in model_specific_yields["overall"]:
                    model_specific_yields["overall"][station] = {"totalParts": 0, "passedParts": 0, "failedParts": 0}
                
                model_specific_yields["overall"][station]["totalParts"] += total
                model_specific_yields["overall"][station]["passedParts"] += passed
                model_specific_yields["overall"][station]["failedParts"] += failed
            
            for station in model_specific_yields["overall"]:
                total = model_specific_yields["overall"][station]["totalParts"]
                passed = model_specific_yields["overall"][station]["passedParts"]
                throughput_yield = (passed / total * 100) if total > 0 else 0
                model_specific_yields["overall"][station]["throughputYield"] = round(throughput_yield, 2)
            
            return model_specific_yields
    finally:
        conn.close()

def calculate_hardcoded_tpy(model_yields):
    """Calculate hardcoded 4-station TPY"""
    hardcoded_tpy = {
        "SXM4": {"stations": {}, "tpy": None},
        "SXM5": {"stations": {}, "tpy": None},
        "SXM6": {"stations": {}, "tpy": None}
    }
    
    # SXM4 formula: VI2 × ASSY2 × FI × FQC
    sxm4_stations = ["VI2", "ASSY2", "FI", "FQC"]
    sxm4_values = []
    
    for station in sxm4_stations:
        if "Tesla SXM4" in model_yields and station in model_yields["Tesla SXM4"]:
            yield_pct = model_yields["Tesla SXM4"][station]["throughputYield"]
            hardcoded_tpy["SXM4"]["stations"][station] = yield_pct
            sxm4_values.append(yield_pct / 100.0)
    
    if len(sxm4_values) == 4:
        tpy_value = 1.0
        for val in sxm4_values:
            tpy_value *= val
        hardcoded_tpy["SXM4"]["tpy"] = round(tpy_value * 100, 2)
    
    # SXM5/6 formula: BBD × ASSY2 × FI × FQC
    sxm5_stations = ["BBD", "ASSY2", "FI", "FQC"]
    
    for model_name in ["SXM5", "SXM6"]:
        model_key = f"Tesla {model_name}" if model_name == "SXM5" else model_name
        values = []
        
        for station in sxm5_stations:
            if model_key in model_yields and station in model_yields[model_key]:
                yield_pct = model_yields[model_key][station]["throughputYield"]
                hardcoded_tpy[model_name]["stations"][station] = yield_pct
                values.append(yield_pct / 100.0)
        
        if len(values) == 4:
            tpy_value = 1.0
            for val in values:
                tpy_value *= val
            hardcoded_tpy[model_name]["tpy"] = round(tpy_value * 100, 2)
    
    return hardcoded_tpy

def calculate_dynamic_tpy(model_yields):
    """Calculate DYNAMIC all-stations TPY per model"""
    dynamic_tpy = {
        "SXM4": {"stations": {}, "tpy": None, "stationCount": 0},
        "SXM5": {"stations": {}, "tpy": None, "stationCount": 0},
        "SXM6": {"stations": {}, "tpy": None, "stationCount": 0}
    }
    
    model_mappings = {
        "SXM4": "Tesla SXM4",
        "SXM5": "Tesla SXM5",
        "SXM6": "SXM6"
    }
    
    for model_short, model_full in model_mappings.items():
        if model_full in model_yields:
            stations = model_yields[model_full]
            dynamic_tpy[model_short]["stations"] = {station: data["throughputYield"] for station, data in stations.items()}
            dynamic_tpy[model_short]["stationCount"] = len(stations)
            
            if stations:
                tpy_value = 1.0
                for yield_pct in dynamic_tpy[model_short]["stations"].values():
                    tpy_value *= (yield_pct / 100.0)
                dynamic_tpy[model_short]["tpy"] = round(tpy_value * 100, 2)
    
    return dynamic_tpy

def aggregate_weekly_tpy_for_week(week_id):
    """Aggregate weekly TPY metrics for a specific week"""
    print(f"\nAGGREGATING WEEKLY TPY FOR: {week_id}")
    print("=" * 60)
    
    week_start, week_end = get_week_date_range(week_id)
    
    weekly_first_pass_yield = calculate_weekly_first_pass_yield_from_raw(week_start, week_end)
    
    model_specific_yields = calculate_model_specific_throughput_yields(week_start, week_end)
    
    hardcoded_tpy = calculate_hardcoded_tpy(model_specific_yields)
    
    dynamic_tpy = calculate_dynamic_tpy(model_specific_yields)
    
    conn = psycopg2.connect(**DATABASE)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    SUM(total_parts) as total_parts,
                    SUM(passed_parts) as passed_parts
                FROM daily_tpy_metrics 
                WHERE date_id >= %s AND date_id <= %s
            """, (week_start, week_end))
            
            daily_result = cur.fetchone()
            total_parts_overall = daily_result[0] if daily_result[0] else 0
            total_passed_parts = daily_result[1] if daily_result[1] else 0
            overall_yield = (total_passed_parts / total_parts_overall * 100) if total_parts_overall > 0 else 0
            
            weekly_station_metrics = model_specific_yields["overall"]
            avg_throughput_yield = round(sum(s["throughputYield"] for s in weekly_station_metrics.values()) / len(weekly_station_metrics), 2) if weekly_station_metrics else 0
            
            best_station = None
            worst_station = None
            if weekly_station_metrics:
                best_station = max(weekly_station_metrics.items(), key=lambda x: x[1]["throughputYield"])
                worst_station = min(weekly_station_metrics.items(), key=lambda x: x[1]["throughputYield"])
            
            # Insert main weekly metrics
            cur.execute("""
                INSERT INTO weekly_tpy_metrics (
                    week_id, week_start, week_end, days_in_week,
                    weekly_first_pass_yield_traditional_parts_started,
                    weekly_first_pass_yield_traditional_first_pass_success,
                    weekly_first_pass_yield_traditional_first_pass_yield,
                    weekly_first_pass_yield_completed_only_active_parts,
                    weekly_first_pass_yield_completed_only_first_pass_success,
                    weekly_first_pass_yield_completed_only_first_pass_yield,
                    weekly_first_pass_yield_breakdown_parts_completed,
                    weekly_first_pass_yield_breakdown_parts_failed,
                    weekly_first_pass_yield_breakdown_parts_stuck_in_limbo,
                    weekly_first_pass_yield_breakdown_total_parts,
                    weekly_overall_yield_total_parts,
                    weekly_overall_yield_completed_parts,
                    weekly_overall_yield_overall_yield,
                    weekly_throughput_yield_station_metrics,
                    weekly_throughput_yield_average_yield,
                    total_stations,
                    best_station_name,
                    best_station_yield,
                    worst_station_name,
                    worst_station_yield
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) ON CONFLICT (week_id) DO UPDATE SET
                    week_start = EXCLUDED.week_start,
                    week_end = EXCLUDED.week_end,
                    days_in_week = EXCLUDED.days_in_week,
                    weekly_first_pass_yield_traditional_parts_started = EXCLUDED.weekly_first_pass_yield_traditional_parts_started,
                    weekly_first_pass_yield_traditional_first_pass_success = EXCLUDED.weekly_first_pass_yield_traditional_first_pass_success,
                    weekly_first_pass_yield_traditional_first_pass_yield = EXCLUDED.weekly_first_pass_yield_traditional_first_pass_yield,
                    weekly_first_pass_yield_completed_only_active_parts = EXCLUDED.weekly_first_pass_yield_completed_only_active_parts,
                    weekly_first_pass_yield_completed_only_first_pass_success = EXCLUDED.weekly_first_pass_yield_completed_only_first_pass_success,
                    weekly_first_pass_yield_completed_only_first_pass_yield = EXCLUDED.weekly_first_pass_yield_completed_only_first_pass_yield,
                    weekly_first_pass_yield_breakdown_parts_completed = EXCLUDED.weekly_first_pass_yield_breakdown_parts_completed,
                    weekly_first_pass_yield_breakdown_parts_failed = EXCLUDED.weekly_first_pass_yield_breakdown_parts_failed,
                    weekly_first_pass_yield_breakdown_parts_stuck_in_limbo = EXCLUDED.weekly_first_pass_yield_breakdown_parts_stuck_in_limbo,
                    weekly_first_pass_yield_breakdown_total_parts = EXCLUDED.weekly_first_pass_yield_breakdown_total_parts,
                    weekly_overall_yield_total_parts = EXCLUDED.weekly_overall_yield_total_parts,
                    weekly_overall_yield_completed_parts = EXCLUDED.weekly_overall_yield_completed_parts,
                    weekly_overall_yield_overall_yield = EXCLUDED.weekly_overall_yield_overall_yield,
                    weekly_throughput_yield_station_metrics = EXCLUDED.weekly_throughput_yield_station_metrics,
                    weekly_throughput_yield_average_yield = EXCLUDED.weekly_throughput_yield_average_yield,
                    total_stations = EXCLUDED.total_stations,
                    best_station_name = EXCLUDED.best_station_name,
                    best_station_yield = EXCLUDED.best_station_yield,
                    worst_station_name = EXCLUDED.worst_station_name,
                    worst_station_yield = EXCLUDED.worst_station_yield;
            """, (
                week_id, week_start, week_end, 7,  # days_in_week = 7
                weekly_first_pass_yield["traditional"]["partsStarted"],
                weekly_first_pass_yield["traditional"]["firstPassSuccess"],
                weekly_first_pass_yield["traditional"]["firstPassYield"],
                weekly_first_pass_yield["completedOnly"]["activeParts"],
                weekly_first_pass_yield["completedOnly"]["firstPassSuccess"],
                weekly_first_pass_yield["completedOnly"]["firstPassYield"],
                weekly_first_pass_yield["breakdown"]["partsCompleted"],
                weekly_first_pass_yield["breakdown"]["partsFailed"],
                weekly_first_pass_yield["breakdown"]["partsStuckInLimbo"],
                weekly_first_pass_yield["breakdown"]["totalParts"],
                total_parts_overall,
                total_passed_parts,
                round(overall_yield, 2),
                json.dumps(weekly_station_metrics),
                avg_throughput_yield,
                len(weekly_station_metrics),
                best_station[0] if best_station else None,
                best_station[1]["throughputYield"] if best_station else None,
                worst_station[0] if worst_station else None,
                worst_station[1]["throughputYield"] if worst_station else None
            ))

            # Insert model-specific metrics
            for model_name, model_data in hardcoded_tpy.items():
                if model_data["stations"]:  # Only insert if we have data for this model
                    cur.execute("""
                        INSERT INTO weekly_tpy_model_metrics (
                            week_id,
                            model,
                            hardcoded_stations,
                            hardcoded_tpy,
                            dynamic_stations,
                            dynamic_tpy,
                            dynamic_station_count
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (week_id, model) DO UPDATE SET
                            hardcoded_stations = EXCLUDED.hardcoded_stations,
                            hardcoded_tpy = EXCLUDED.hardcoded_tpy,
                            dynamic_stations = EXCLUDED.dynamic_stations,
                            dynamic_tpy = EXCLUDED.dynamic_tpy,
                            dynamic_station_count = EXCLUDED.dynamic_station_count;
                    """, (
                        week_id,
                        f"Tesla {model_name}" if model_name != "SXM6" else "SXM6",
                        json.dumps(model_data["stations"]),
                        model_data["tpy"],
                        json.dumps(dynamic_tpy[model_name]["stations"]),
                        dynamic_tpy[model_name]["tpy"],
                        dynamic_tpy[model_name]["stationCount"]
                    ))

            conn.commit()
            print(f"\nWeekly TPY aggregation complete for {week_id}!")
            
    finally:
        conn.close()

def get_all_available_weeks():
    """Get all unique weeks when actual testing occurred"""
    print("Finding all weeks with test activity...")
    
    conn = psycopg2.connect(**DATABASE)
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
            if not dates:
                return []
            
            weeks = set()
            for date in dates:
                weeks.add(get_week_id(date))
            
            weeks = sorted(list(weeks))
            print(f"  Found {len(weeks)} weeks with test activity from {weeks[0]} to {weeks[-1]}")
            return weeks
    finally:
        conn.close()

def aggregate_weekly_tpy_metrics_all_time():
    """Aggregate weekly TPY metrics for all historical dates"""
    print("WEEKLY TPY METRICS ALL-TIME AGGREGATOR")
    print("=" * 50)
    
    # Get all available weeks
    all_weeks = get_all_available_weeks()
    
    if not all_weeks:
        print("No valid weeks found in the dataset")
        return
    
    print(f"\nProcessing ALL {len(all_weeks)} historical weeks...")
    
    success_count = 0
    error_count = 0
    
    for i, week_id in enumerate(all_weeks, 1):
        try:
            print(f"\nProcessing {i}/{len(all_weeks)}: {week_id}")
            print("-" * 50)
            
            aggregate_weekly_tpy_for_week(week_id)
            success_count += 1
            
        except Exception as e:
            print(f"ERROR processing {week_id}: {str(e)}")
            error_count += 1
    
    print(f"\nWEEKLY TPY ALL-TIME AGGREGATION COMPLETE!")
    print(f"Successfully processed: {success_count} weeks")
    print(f"Errors: {error_count} weeks")

if __name__ == "__main__":
    aggregate_weekly_tpy_metrics_all_time()