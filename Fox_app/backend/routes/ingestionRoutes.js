const express = require('express');
const router = express.Router();
const ingestionController = require('../controllers/ingestionController');

//POST: receive payload from jump server
router.post('/ingestion', ingestionController.receivePayload);

module.exports = router;