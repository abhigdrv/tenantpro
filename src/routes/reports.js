// src/routes/reports.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

// Reports Dashboard
router.get('/', reportsController.dashboard);

// Financial Reports
router.get('/revenue', reportsController.revenueReport);
router.get('/payments', reportsController.paymentsReport);
router.get('/outstanding', reportsController.outstandingReport);

// Occupancy Reports
router.get('/occupancy', reportsController.occupancyReport);
router.get('/vacancy', reportsController.vacancyReport);

// Tenant Reports
router.get('/tenants', reportsController.tenantsReport);
router.get('/lease-expiry', reportsController.leaseExpiryReport);

// Property Reports
router.get('/properties', reportsController.propertiesReport);
router.get('/maintenance', reportsController.maintenanceReport);

// Export Routes
router.get('/export/revenue', reportsController.exportRevenue);
router.get('/export/payments', reportsController.exportPayments);
router.get('/export/tenants', reportsController.exportTenants);

module.exports = router;