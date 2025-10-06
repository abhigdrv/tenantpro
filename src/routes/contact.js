// src/routes/tenants.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// View all contact messages (Admin only)
router.get('/', contactController.listContacts);

// Mark message as read
router.post('/:id/mark-read', contactController.markRead);

// Mark message as responded
router.post('/:id/mark-responded', contactController.markResponded);

// Delete contact message
router.delete('/:id', contactController.deleteContact);

// Get single contact message details
router.get('/:id', contactController.getContactDetail);

module.exports = router;