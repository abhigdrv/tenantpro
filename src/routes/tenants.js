// src/routes/tenants.js
const express = require('express');
const router = express.Router();
const tenantsController = require('../controllers/tenantsController');

// Tenants CRUD Routes
router.get('/', tenantsController.listTenants);
router.get('/new', tenantsController.newTenantForm);
router.post('/', tenantsController.createTenant);
router.get('/:id', tenantsController.viewTenant);
router.get('/:id/edit', tenantsController.editTenantForm);
router.post('/:id/edit', tenantsController.updateTenant);
router.post('/:id/delete', tenantsController.deleteTenant);

module.exports = router;