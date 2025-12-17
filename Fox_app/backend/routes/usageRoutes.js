// ======================================================================
// Usage routes with RBAC
// Superuser: full CRUD
// Regular user: GET & PATCH only
// ======================================================================

const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');
const { allowReadUpdate, isSuperuser } = require('../middlewares/roleCheck');

// READ all usage records — allowed for all users
router.get('/', allowReadUpdate, usageController.getAllUsage);

// Get station usage summary (7d, 30d, 24h, etc.)
router.get("/summary/stations", allowReadUpdate, usageController.getStationSummary);

//Get Summary for UsageServices
router.get("/summary", allowReadUpdate, usageController.getUsageSummary);

// Get fixture status over time (line chart)
router.get("/status-over-time", allowReadUpdate, usageController.getFixtureStatusOverTime);

//Get status for UsageServices
router.get("/status", usageController.getUsageStatus);

//Get history for UsageServices
//router.get("/history", usageController.getUsageHistory);

// READ single usage record by ID — allowed for all users
router.get('/:id', allowReadUpdate, usageController.getUsageById);

// CREATE usage record — superuser only
router.post('/', isSuperuser, usageController.postUsage);

// UPDATE usage record — allowed for all users
router.patch('/:id', allowReadUpdate, usageController.updateUsage);

// DELETE usage record — superuser only
router.delete('/:id', isSuperuser, usageController.deleteUsage);

module.exports = router;
