// ============================================================================
// File: services/usageService.js
// CLEAN SQL-ONLY VERSION — summary, status, history, weekly activity, stations
// ============================================================================

const { pool } = require("../db.js");

class UsageService {

    // =========================================================================
    // SUMMARY — your existing logic
    // =========================================================================
    static async getFixtureUsageSummary() {
        const query = `
            SELECT 
                f.id AS fixture_id,
                f.fixture_name AS fixture_name,
                fp.id AS fixture_part_id,
                fp.tester_type,
                fp.fixture_sn,
                fp.test_type AS configured_test_type,
                u.test_station,
                u.test_type AS running_test_type,
                u.gpu_pn,
                u.gpu_sn,
                u.log_path,
                u.create_date
            FROM fixtures f
            LEFT JOIN fixture_parts fp 
                ON fp.parent_fixture_id = f.id
            LEFT JOIN usage u 
                ON u.fixture_part_id = fp.id
            ORDER BY f.fixture_name ASC;
        `;

        const { rows } = await pool.query(query);

        const fixtures = {};

        for (const row of rows) {
            if (!fixtures[row.fixture_id]) {
                fixtures[row.fixture_id] = {
                    fixture_id: row.fixture_id,
                    fixture_name: row.fixture_name,
                    slots: { LA: null, RA: null },
                    status: "Unknown",
                    notes: ""
                };
            }

            let slot = null;
            if (row.tester_type === "LA Slot") slot = "LA";
            if (row.tester_type === "RA Slot") slot = "RA";

            if (slot) {
                fixtures[row.fixture_id].slots[slot] = {
                    fixture_part_id: row.fixture_part_id,
                    fixture_sn: row.fixture_sn,
                    test_station: row.test_station,
                    test_type: row.running_test_type,
                    gpu_pn: row.gpu_pn,
                    gpu_sn: row.gpu_sn,
                    log_path: row.log_path,
                    create_date: row.create_date
                };
            }
        }

        // Business rules
        for (const fixture of Object.values(fixtures)) {
            const LA = fixture.slots.LA;
            const RA = fixture.slots.RA;

            if (!LA && !RA) {
                fixture.status = "Idle";
                fixture.notes = "No units inserted";
                continue;
            }

            if (!LA || !RA) {
                fixture.status = "Partial";
                fixture.notes = "Only one active unit";
                continue;
            }

            const LA_empty = !LA.gpu_pn && !LA.gpu_sn && !LA.test_station;
            const RA_empty = !RA.gpu_pn && !RA.gpu_sn && !RA.test_station;

            if (LA_empty && RA_empty) {
                fixture.status = "Inactive";
                fixture.notes = "Both slots empty";
                continue;
            }

            if (LA_empty || RA_empty) {
                fixture.status = "Partial";
                fixture.notes = "One slot empty";
                continue;
            }

            if (LA.gpu_pn !== RA.gpu_pn) {
                fixture.status = "Error";
                fixture.notes = "Part number mismatch";
                continue;
            }

            if (LA.test_station !== RA.test_station) {
                fixture.status = "Error";
                fixture.notes = "Station mismatch";
                continue;
            }

            const station = (LA.test_station || "").trim().toUpperCase();

            if (station === "ASSY2") {
                fixture.status = "Finished";
                fixture.notes = "Testing complete";
            } else {
                fixture.status = "Testing";
                fixture.notes = `Running ${station}`;
            }
        }

        return Object.values(fixtures);
    }

    // =========================================================================
    // STATUS — FIXED SQL VERSION
    // =========================================================================
    static async getFixtureUsageStatus() {
        const totalResult = await pool.query(`
            SELECT COUNT(*) AS count FROM fixtures
        `);

        const maintenanceResult = await pool.query(`
            SELECT COUNT(*) AS count
            FROM fixture_maintenance
            WHERE is_completed = FALSE
        `);

        const total = Number(totalResult.rows[0].count);
        const under_maintenance = Number(maintenanceResult.rows[0].count);

        return {
            total_fixture: total,
            working_fixtures: total - under_maintenance,
            under_maintenance
        };
    }

    // =========================================================================
    // HISTORY — FIXED SQL VERSION
    // =========================================================================
    static async getUsageHistory() {
        try {
            const result = await pool.query(`
                SELECT *
                FROM usage_history
                ORDER BY date ASC
            `);

            return result.rows;
        } catch (err) {
            console.warn("⚠ usage_history table not found — returning empty[]");
            return [];
        }
    }

    // =========================================================================
    // NEW — WEEKLY STATION ACTIVITY (for the line graph)
    // =========================================================================
    static async getWeeklyStationActivity(days = 30) {
        const query = `
            SELECT
                DATE_TRUNC('week', u.create_date) AS week,
                u.test_station,
                COUNT(*) AS count
            FROM usage u
            WHERE u.create_date >= NOW() - INTERVAL '${days} days'
              AND u.test_station IS NOT NULL
            GROUP BY week, u.test_station
            ORDER BY week ASC;
        `;

        const { rows } = await pool.query(query);
        return rows;
    }

    // ======================================================================
    // Station Summary (last X days) — FINAL FIXED VERSION
    // ======================================================================
    static async getStationSummary(range = "7d") {
        const client = await pool.connect();
        try {
            // convert "7d" → "7 days", "24h" → "24 hours"
            const interval = range.endsWith("d")
                ? `${parseInt(range)} days`
                : range.endsWith("h")
                ? `${parseInt(range)} hours`
                : "7 days";

            const query = `
                SELECT 
                    u.test_station,

                    COUNT(*) AS total_runs,

                    -- Slot split
                    COUNT(CASE WHEN u.test_slot = 'LA' THEN 1 END) AS la_runs,
                    COUNT(CASE WHEN u.test_slot = 'RA' THEN 1 END) AS ra_runs,

                    -- Type split
                    COUNT(CASE WHEN u.test_type = 'Refurbish' THEN 1 END) AS refurbish_runs,
                    COUNT(CASE WHEN u.test_type = 'Sort' THEN 1 END) AS sort_runs,
                    COUNT(CASE WHEN u.test_type = 'Debug' THEN 1 END) AS debug_runs,

                    MIN(u.create_date) AS first_run,
                    MAX(u.create_date) AS last_run

                FROM usage u
                WHERE u.create_date >= NOW() - INTERVAL '${interval}'
                GROUP BY u.test_station
                ORDER BY u.test_station ASC;
            `;

            const result = await client.query(query);
            return result.rows;

        } catch (err) {
            console.error("Error in UsageService.getStationSummary:", err);
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = UsageService;
