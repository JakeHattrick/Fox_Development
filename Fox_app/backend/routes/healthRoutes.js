// ======================================================================
// Health routes with RBAC
// Superuser: full CRUD
// Regular user: GET & PATCH only
// ======================================================================

const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const { allowReadUpdate, isSuperuser } = require('../middlewares/roleCheck');

//  NEW HEALTH SUMMARY ENDPOINT — place it BEFORE the '/:id' route
router.get('/summary', allowReadUpdate, healthController.getHealthSummary);
router.get('/summary/:fixtureId', allowReadUpdate, healthController.getHealthSummaryByFixture);

// READ all health records — allowed for all users
router.get('/', allowReadUpdate, healthController.getAllHealth);

// READ single health record by ID — allowed for all users
router.get('/:id', allowReadUpdate, healthController.getHealthById);

// CREATE health record — superuser only
router.post('/', isSuperuser, healthController.postHealth);

// UPDATE health record — allowed for all users
router.patch('/:id', allowReadUpdate, healthController.updateHealth);

// DELETE health record — superuser only
router.delete('/:id', isSuperuser, healthController.deleteHealth);

module.exports = router;
