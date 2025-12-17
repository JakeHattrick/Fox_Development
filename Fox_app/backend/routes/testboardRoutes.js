// ============================================================================
// File: routes/testboardRoutes.js
// PURPOSE:
//   HTTP routes for testboard analytics
// ============================================================================
const express = require("express");
const router = express.Router();
const TestBoardService = require("../services/testboardService").default;

// ---------------------------------------------------------------------------
// GET /api/testboard/summary
// ---------------------------------------------------------------------------
router.get("/summary", async (req, res) => {
    try {
        const { range ="7d" } = req.query;
        const data = await TestBoardService.getFixtureTestboardSummary(range);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch testboard summary" });
    }
});

// ---------------------------------------------------------------------------
// GET /api/testboard/status
// ---------------------------------------------------------------------------
router.get("/status", async (req, res) => {
    try {
        const { range = "7d" } = req.query;
        const data = await TestBoardService.getFixtureTestboardStatus(range);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch testboard status KPIs" });
    }
});

// ---------------------------------------------------------------------------
// GET /api/testboard/history/:fixture_no
// ---------------------------------------------------------------------------
router.get("/history/:fixture_no", async (req, res) => {
    try {
        const { fixture_no } = req.params;
        const data = await TestBoardService.getFixtureTestboardHistory(fixture_no);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/testboard/weekly-activity
// ---------------------------------------------------------------------------
router.get("/weekly-activity", async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const data = await TestBoardService.getWeeklyStationActivity(
            parseInt(days)
        );
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch weekly activity" });
    }
});

// ---------------------------------------------------------------------------
// GET /api/testboard/station-summary
// ---------------------------------------------------------------------------
router.get("/station-summary", async (req, res) => {
    try {
        const { range = "7d" } = req.query;
        const data = await TestboardService.getStationSummary(range);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch station summary" });
    }
});

module.exports = router;