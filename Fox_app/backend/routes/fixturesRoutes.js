<<<<<<< HEAD
// Import required libraries and modules
const express = require('express');
const router = express.Router();
// Import required controllers
const fixturesController = require('../controllers/fixturesController');
const healthController = require('../controllers/healthController');
const usageController = require('../controllers/usageController');

// Route endpoints to FIXTURE controllers
router.get('/', fixturesController.getAllFixtures);
router.post('/', fixturesController.postFixture);

// Route endpoints to HEALTH controllers (register BEFORE the generic id route so
// literal paths like /health don't get captured as an :id value)
router.get('/health', healthController.getAllHealth);
router.get('/health/:fixture_id', healthController.getHealthById);
router.post('/health', healthController.postHealth);
router.patch('/health/:primary_key', healthController.updateHealth);
router.delete('/health/:primary_key', healthController.deleteHealth);

// Route endpoints to USAGE controllers
router.get('/usage', usageController.getAllUsage);
router.get('/usage/:fixture_id', usageController.getUsageById);
router.post('/usage', usageController.postUsage);
router.patch('/usage/:primary_key', usageController.updateUsage);
router.delete('/usage/:primary_key', usageController.deleteUsage);

// FIXTURE ID routes (numeric validation happens inside controllers)
router.get('/:id', fixturesController.getFixtureById);
router.patch('/:id', fixturesController.updateFixture);
router.delete('/:id', fixturesController.deleteFixture);

// Export the router

module.exports = router;
=======
// routes/fixturesRoutes.js

// ======================================================================
// PURPOSE:
//   Routes for fixtures table with role-based access control (RBAC).
//   - Superusers: full CRUD
//   - Regular users: GET & PATCH only
//   - Uses temporary role mock in server.js for testing
// ======================================================================

// Import required libraries
const express = require('express');
const router = express.Router();

// Import controller
const fixturesController = require('../controllers/fixturesController');

// Import RBAC middlewares
const { allowReadUpdate, isSuperuser } = require('../middlewares/roleCheck');

// ==========================
// FIXTURES ROUTES
// ==========================

// READ all fixtures — allowed for all users
router.get('/', allowReadUpdate, fixturesController.getAllFixtures);

// READ a single fixture by ID — allowed for all users
router.get('/:id', allowReadUpdate, fixturesController.getFixtureById);

// CREATE a new fixture — superuser only
router.post('/', isSuperuser, fixturesController.postFixture);

// UPDATE a fixture — allowed for all users
router.patch('/:id', allowReadUpdate, fixturesController.updateFixtures);

// DELETE a fixture — superuser only
router.delete('/:id', isSuperuser, fixturesController.deleteFixture);

module.exports = router;
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
