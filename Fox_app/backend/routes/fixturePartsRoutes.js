// routes/fixturePartsRoutes.js

// ======================================================================
// PURPOSE:
//   Routes for fixture_parts table with role-based access control (RBAC).
//   - Superusers: full CRUD
//   - Regular users: GET & PATCH only
//   - Uses temporary role mock in server.js for testing
// ======================================================================

// Import required libraries
const express = require('express');
const router = express.Router();

// Import controller
const fixturePartsController = require('../controllers/fixturePartsController');

// Import RBAC middlewares
const { allowReadUpdate, isSuperuser } = require('../middlewares/roleCheck');

// ==========================
// FIXTURE PARTS ROUTES
// ==========================

// READ all fixture parts — allowed for all users
router.get('/', allowReadUpdate, fixturePartsController.getAllFixtureParts);

// READ a single fixture part by ID — allowed for all users
router.get('/:id', allowReadUpdate, fixturePartsController.getFixturePartById);

// CREATE a new fixture part — superuser only
router.post('/', isSuperuser, fixturePartsController.postFixturePart);

// UPDATE a fixture part — allowed for all users
router.patch('/:id', allowReadUpdate, fixturePartsController.updateFixturePart);

// DELETE a fixture part — superuser only
router.delete('/:id', isSuperuser, fixturePartsController.deleteFixturePart);

module.exports = router;
