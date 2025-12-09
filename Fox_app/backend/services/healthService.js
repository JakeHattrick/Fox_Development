// ============================================================================
// File: services/healthService.js
//
// PURPOSE:
//   Performs all high-level fixture health calculations.
//   - Reads from: fixtures, health, fixture_maintenance
//   - Produces computed health metrics for each fixture.
// ============================================================================

const { pool } = require('../db.js');

// ----------------------------------------------------
// Helper: get uptime %
// ----------------------------------------------------
function calculateUptime(events) {
    if (events.length === 0) return 100;

    let active = 0;
    let down = 0;

    for (const e of events) {
        if (e.status === "active") active++;
        if (e.status === "no_response") down++;
    }

    const total = active + down;
    if (total === 0) return 100;

    return Math.round((active / total) * 100);
}

// ----------------------------------------------------
// Helper: compute overall health score (0–100)
// ----------------------------------------------------
function computeHealthScore({ uptime, recentStatus, lastMaintenanceDays }) {
    let score = 100;

    // Uptime factor
    if (uptime < 95) score -= (95 - uptime) * 0.8;
    if (uptime < 85) score -= 10;

    // Status factor
    if (recentStatus === "no_response") score -= 5;
    if (recentStatus === "under_maintenance") score -= 10;
    if (recentStatus === "RMA") score -= 50;

    // Maintenance recency
    if (lastMaintenanceDays > 30) score -= 5;
    if (lastMaintenanceDays > 90) score -= 10;
    if (lastMaintenanceDays > 180) score -= 20;

    if (score < 0) score = 0;
    return Math.round(score);
}

// ----------------------------------------------------
// MAIN SERVICE — health summary for all fixtures
// ----------------------------------------------------
async function getHealthSummary() {
    const fixtures = (await pool.query(
        `SELECT id, fixture_name, gen_type, test_type FROM fixtures`
    )).rows;

    const healthEvents = (await pool.query(
        `SELECT * FROM health ORDER BY create_date DESC`
    )).rows;

    const maintenanceEvents = (await pool.query(
        `SELECT * FROM fixture_maintenance ORDER BY start_date_time DESC`
    )).rows;

    return fixtures.map(f => {
        const fixtureHealthEvents = healthEvents.filter(h => h.fixture_id === f.id);
        const fixtureMaintenance = maintenanceEvents.filter(m => m.fixture_id === f.id);

        const recentStatus = fixtureHealthEvents[0]?.status || "active";
        const uptime = calculateUptime(fixtureHealthEvents);

        // Last maintenance date
        let lastMaintenanceDays = 0;
        if (fixtureMaintenance.length > 0) {
            const last = fixtureMaintenance[0].start_date_time;
            lastMaintenanceDays =
                last ? Math.floor((Date.now() - new Date(last)) / (1000 * 60 * 60 * 24)) : 0;
        }

        const score = computeHealthScore({ uptime, recentStatus, lastMaintenanceDays });

        return {
            fixture_id: f.id,
            fixture_name: f.fixture_name,

            recent_status: recentStatus,
            uptime_percentage: uptime,
            last_maintenance_days: lastMaintenanceDays,

            health_score: score
        };
    });
}

// ----------------------------------------------------
// Summary for ONE fixture (fixed)
// ----------------------------------------------------
async function getHealthSummaryById(fixtureId) {
    const all = await getHealthSummary();
    return all.find(f => f.fixture_id === fixtureId) || null;
}


module.exports = {
    getHealthSummary,
    getHealthSummaryById
};
