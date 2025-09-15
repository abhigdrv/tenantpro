// src/routes/maintenance.js
const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');

// Maintenance Requests CRUD Routes
router.get('/', maintenanceController.listRequests);
router.get('/new', maintenanceController.newRequestForm);
router.post('/', maintenanceController.createRequest);
router.get('/:id', maintenanceController.viewRequest);
router.get('/:id/edit', maintenanceController.editRequestForm);
router.post('/:id/edit', maintenanceController.updateRequest);
router.post('/:id/delete', maintenanceController.deleteRequest);

module.exports = router;