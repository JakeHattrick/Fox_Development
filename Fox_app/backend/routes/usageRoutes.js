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

// READ single usage record by ID — allowed for all users
router.get('/:id', allowReadUpdate, usageController.getUsageById);

// CREATE usage record — superuser only
router.post('/', isSuperuser, usageController.postUsage);

// UPDATE usage record — allowed for all users
router.patch('/:id', allowReadUpdate, usageController.updateUsage);

// DELETE usage record — superuser only
router.delete('/:id', isSuperuser, usageController.deleteUsage);

module.exports = router;
