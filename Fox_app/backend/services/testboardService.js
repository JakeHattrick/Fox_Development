// ============================================================================
// File: services/testboardService.js
// PURPOSE:
//   Testboard analytics service — fixture-level (no slots)
//   Mirrors the structure/philosophy of UsageService, but operates on
//   testboard_master_log (event-based, historical timeline).
// ============================================================================

import { pool } from "../db.js";

class TestboardService {

    // =========================================================================
    // SUMMARY — fixture-level latest activity
    // =========================================================================
    static async getFixtureTestboardSummary(range = "7d") {
        // STEP 1: Convert range string to SQL interval
        const interval = range.endsWith("d")
            ? `${parseInt(range)} days`
            : range.endsWith("h")
            ? `${parseInt(range)} hours`
            : "7 days";

        // STEP 2: Fetch latest log entry per fixture_no within range
        const query = `
            SELECT DISTINCT ON (fixture_no)
                fixture_no,
                workstation_name,
                work_station_process,
                sn AS unit_sn,
                pn AS unit_pn,
                model,
                operator,
                history_station_start_time AS start_time,
                history_station_end_time AS end_time,
                history_station_passing_status
            FROM testboard_master_log
            WHERE history_station_start_time >= NOW() - INTERVAL '${interval}'
            ORDER BY fixture_no, history_station_start_time DESC;
        `;

        const { rows } = await pool.query(query);

        // STEP 3: Infer fixture status in JS
        const fixtures = rows.map(row => {
            let status = "Unknown";
            let notes = "";

            if (!row.start_time) {
                status = "Unknown";
                notes = "Missing start time";
            } else if (!row.end_time) {
                status = "Running";
                notes = `Running at ${row.workstation_name}`;
            } else if ((row.history_station_passing_status || "").toLowerCase() === "pass") {
                status = "Passed";
                notes = `Completed at ${row.workstation_name}`;
            } else {
                status = "Failed";
                notes = `Failed at ${row.workstation_name}`;
            }

            // Duration calculation (minutes)
            let duration_minutes = null;
            if (row.start_time && row.end_time) {
                duration_minutes = Math.round(
                    (new Date(row.end_time) - new Date(row.start_time)) / 60000
                );
            }

            return {
                fixture_no: row.fixture_no,
                workstation_name: row.workstation_name,
                work_station_process: row.work_station_process,
                board_sn: row.board_sn,
                board_pn: row.board_pn,
                model: row.model,
                operator: row.operator,
                start_time: row.start_time,
                end_time: row.end_time,
                duration_minutes,
                status,
                notes
            };
        });

        return fixtures;
    }

    // =========================================================================
    // STATUS KPIs — high-level counters
    // =========================================================================
    static async getFixtureTestboardStatus(range = "7d") {

        // STEP 1: Convert range string to SQL interval
        const interval = range.endsWith("d")
            ? `${parseInt(range)} days`
            : range.endsWith("h")
            ? `${parseInt(range)} hours`
            : "7 days";

        // STEP 2: Pull latest record per fixture within the time window
        const query = `
            SELECT DISTINCT ON (fixture_no)
                fixture_no,
                history_station_start_time AS start_time,
                history_station_end_time AS end_time,
                history_station_passing_status
            FROM testboard_master_log
            WHERE history_station_start_time >= NOW() - INTERVAL '${interval}'
            ORDER BY fixture_no, history_station_start_time DESC;
        `;

        const { rows } = await pool.query(query);

        // STEP 3: Infer status counts in JS
        let running = 0;
        let passed = 0;
        let failed = 0;

        for (const row of rows) {
            if (!row.start_time) {
                continue; // Unknown / corrupt rows ignored in KPIs
            }

            if (!row.end_time) {
                running++;
            } else if ((row.history_station_passing_status || "").toLowerCase() === "pass") {
                passed++;
            } else {
                failed++;
            }
        }

        return {
            total_fixtures_seen: rows.length,
            running,
            passed,
            failed
        };
    }

    // =========================================================================
    // HISTORY — full timeline for a fixture
    // =========================================================================
    static async getFixtureTestboardHistory(fixture_no) {
        // STEP 1: Validate input
        if (!fixture_no) {
            throw new Error("fixture_no is required");
        }

        // STEP 2: Query full timeline for the fixture
        const query = `
            SELECT
                id,
                fixture_no,
                workstation_name,
                work_station_process,
                sn,
                pn,
                model,
                baseboard_sn,
                baseboard_pn,
                operator,
                history_station_start_time,
                history_station_end_time,
                history_station_passing_status,
                failure_code,
                failure_reasons,
                failure_note,
                created_at
            FROM testboard_master_log
            WHERE fixture_no = $1
            ORDER BY history_station_start_time ASC;
        `;

        const { rows } = await pool.query(query, [fixture_no]);
        return rows;
    }

    // =========================================================================
    // WEEKLY STATION ACTIVITY — line graph support
    // =========================================================================
   static async getWeeklyStationActivity(days = 30) {

    const safeDays = Number.parseInt(days, 10) || 30;

    const query = `
        SELECT
            DATE_TRUNC('week', history_station_start_time) AS week,
            workstation_name,
            COUNT(*) AS run_count
        FROM testboard_master_log
        WHERE history_station_start_time >= NOW() - INTERVAL '${safeDays} days'
          AND workstation_name IS NOT NULL
        GROUP BY week, workstation_name
        ORDER BY week ASC, workstation_name ASC;
    `;

    const { rows } = await pool.query(query);
    return rows;
}

    // =========================================================================
    // STATION SUMMARY — detailed analytics per workstation
    // =========================================================================
    static async getStationSummary(range = "7d") {
        
        // STEP 1: Convert range string to SQL interval
        const interval = range.endsWith("d")
            ? `${parseInt(range)} days`
            : range.endsWith("h")
            ? `${parseInt(range)} hours`
            : "7 days";

        // STEP 2: Aggregate per workstation
        const query = `
            SELECT
                workstation_name,
                COUNT(*) AS total_runs,

                COUNT(CASE WHEN LOWER(history_station_passing_status) = 'pass' THEN 1 END) AS pass_count,
                COUNT(CASE WHEN LOWER(history_station_passing_status) <> 'pass' THEN 1 END) AS fail_count,

                AVG(
                    EXTRACT(EPOCH FROM (history_station_end_time - history_station_start_time)) / 60
                ) AS avg_duration_minutes,

                MIN(history_station_start_time) AS first_run,
                MAX(history_station_end_time) AS last_run
            FROM testboard_master_log
            WHERE history_station_start_time >= NOW() - INTERVAL '${interval}'
              AND workstation_name IS NOT NULL
            GROUP BY workstation_name
            ORDER BY workstation_name ASC;
        `;

        const { rows } = await pool.query(query);
        return rows;
    }
}

export default TestboardService;

