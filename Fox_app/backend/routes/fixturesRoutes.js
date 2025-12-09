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
