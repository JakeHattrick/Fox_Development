<<<<<<< HEAD
// Import required libraries and modules
const express = require('express');
const router = express.Router();
// Import required controllers
const fixtureMaintenanceController = require('../controllers/fixtureMaintenanceController');

// Route endpoints to controller functions 
router.get('/', fixtureMaintenanceController.getAllMaintenances);
router.get('/:id', fixtureMaintenanceController.getMaintenanceById);
router.put('/putMaintenance/:id', fixtureMaintenanceController.putMaintenanceById);
router.post('/postMaintenance/:id', fixtureMaintenanceController.postMaintenanceById);
router.delete('/deleteMaintenance/:id', fixtureMaintenanceController.deleteMaintenanceById);

module.exports = router;
=======
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
>>>>>>> c64a975df81fe715c36d4cc9fad4a05963808ce3
