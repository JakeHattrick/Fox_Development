const express = require('express');
const router = express.Router();
const fixtureMaintenanceController = require('../controllers/fixtureMaintenanceController');
const { allowAllMaintenance } = require('../middlewares/roleCheck');

// All users can CRUD
router.get('/', allowAllMaintenance, fixtureMaintenanceController.getAllMaintenance);
router.get('/:id', allowAllMaintenance, fixtureMaintenanceController.getMaintenanceById);
router.post('/', allowAllMaintenance, fixtureMaintenanceController.postMaintenance);
router.patch('/:id', allowAllMaintenance, fixtureMaintenanceController.updateMaintenance);
router.delete('/:id', allowAllMaintenance, fixtureMaintenanceController.deleteMaintenance);

module.exports = router;
