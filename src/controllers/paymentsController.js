// src/controllers/paymentsController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listPayments = async (req, res) => {
    const payments = await prisma.payment.findMany({
        include: {
            lease: {
                include: {
                    tenant: true,
                    room: { include: { property: true } }
                }
            }
        },
        orderBy: {
            paymentDate: 'desc'
        }
    });
    res.render('payments/list', { payments });
};

exports.newPaymentForm = async (req, res) => {
    const leases = await prisma.lease.findMany({
        include: {
            tenant: true,
            room: { include: { property: true } }
        }
    });
    res.render('payments/form', { payment: null, leases, title: 'Record New Payment' });
};

exports.createPayment = async (req, res) => {
    const { leaseId, amount, paymentDate, paymentForMonth, note, status } = req.body;
    try {
        await prisma.payment.create({
            data: {
                leaseId: parseInt(leaseId),
                amount: parseFloat(amount),
                paymentDate: new Date(paymentDate),
                paymentForMonth: new Date(paymentForMonth),
                note: note,
                status: status,
            },
        });
        res.redirect('/agent/payments');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error recording payment.');
    }
};

exports.viewPayment = async (req, res) => {
    const payment = await prisma.payment.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
            lease: {
                include: {
                    tenant: true,
                    room: { include: { property: true } }
                }
            }
        },
    });
    if (!payment) {
        return res.status(404).send('Payment not found.');
    }
    res.render('payments/view', { payment });
};

exports.editPaymentForm = async (req, res) => {
    const payment = await prisma.payment.findUnique({ where: { id: parseInt(req.params.id) } });
    const leases = await prisma.lease.findMany({
        include: {
            tenant: true,
            room: { include: { property: true } }
        }
    });
    if (!payment) {
        return res.status(404).send('Payment not found.');
    }
    res.render('payments/form', { payment, leases, title: 'Edit Payment Record' });
};

exports.updatePayment = async (req, res) => {
    const { leaseId, amount, paymentDate, paymentForMonth, note, status } = req.body;
    try {
        await prisma.payment.update({
            where: { id: parseInt(req.params.id) },
            data: {
                leaseId: parseInt(leaseId),
                amount: parseFloat(amount),
                paymentDate: new Date(paymentDate),
                paymentForMonth: new Date(paymentForMonth),
                note: note,
                status: status,
            },
        });
        res.redirect(`/agent/payments/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating payment.');
    }
};

exports.deletePayment = async (req, res) => {
    try {
        await prisma.payment.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/agent/payments');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting payment.');
    }
};