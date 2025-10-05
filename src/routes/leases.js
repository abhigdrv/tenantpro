// src/routes/leases.js
const express = require('express');
const router = express.Router();
const leasesController = require('../controllers/leasesController');

// Lease CRUD Routes
router.get('/', leasesController.listLeases);
router.get('/new', leasesController.newLeaseForm);
router.post('/', leasesController.uploadMiddleware, leasesController.createLease);
router.get('/:id', leasesController.viewLease);
router.get('/:id/edit', leasesController.editLeaseForm);
router.post('/:id/edit', leasesController.uploadMiddleware, leasesController.updateLease);
router.post('/:id/delete', leasesController.deleteLease);

// Document Routes
router.post('/:id/documents/:documentId/delete', leasesController.deleteDocument);
router.get('/:id/documents/:documentId/download', leasesController.downloadDocument);

module.exports = router;