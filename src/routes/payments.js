// src/routes/payments.js
const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');

// Payments CRUD Routes
router.get('/', paymentsController.listPayments);
router.get('/new', paymentsController.newPaymentForm);
router.post('/', paymentsController.createPayment);
router.get('/:id', paymentsController.viewPayment);
router.get('/:id/edit', paymentsController.editPaymentForm);
router.post('/:id/edit', paymentsController.updatePayment);
router.post('/:id/delete', paymentsController.deletePayment);

module.exports = router;