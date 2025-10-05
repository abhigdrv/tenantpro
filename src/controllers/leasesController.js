// src/controllers/leasesController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listLeases = async (req, res) => {
    const leases = await prisma.lease.findMany({
        include: { tenant: true, room: { include: { property: true } } }
    });
    res.render('leases/list', { leases });
};

exports.newLeaseForm = async (req, res) => {
    const tenants = await prisma.tenant.findMany();
    const rooms = await prisma.room.findMany({
        where: { status: 'vacant' },
        include: {
            property: true
        }
    });
    res.render('leases/form', { lease: null, tenants, rooms, title: 'Add New Lease' });
};

exports.createLease = async (req, res) => {
    const { tenantId, roomId, startDate, endDate, rentAmount, depositPaid } = req.body;
    try {
        await prisma.lease.create({
            data: {
                tenantId: parseInt(tenantId),
                roomId: parseInt(roomId),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                rentAmount: parseFloat(rentAmount),
                depositPaid: parseFloat(depositPaid),
            },
        });
        await prisma.room.update({
            where: { id: parseInt(roomId) },
            data: { status: 'occupied' },
        });
        res.redirect('/agent/leases');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating lease.');
    }
};

exports.viewLease = async (req, res) => {
    const lease = await prisma.lease.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
            tenant: true,
            room: { include: { property: true } },
            payments: { orderBy: { paymentDate: 'asc' } },
        },
    });
    if (!lease) {
        return res.status(404).send('Lease not found.');
    }
    res.render('leases/view', { lease });
};

exports.editLeaseForm = async (req, res) => {
    const lease = await prisma.lease.findUnique({ where: { id: parseInt(req.params.id) } });
    const tenants = await prisma.tenant.findMany();
    const rooms = await prisma.room.findMany(); // Allow editing to any room
    if (!lease) {
        return res.status(404).send('Lease not found.');
    }
    res.render('leases/form', { lease, tenants, rooms, title: 'Edit Lease' });
};

exports.updateLease = async (req, res) => {
    const { tenantId, roomId, startDate, endDate, rentAmount, depositPaid } = req.body;
    try {
        await prisma.lease.update({
            where: { id: parseInt(req.params.id) },
            data: {
                tenantId: parseInt(tenantId),
                roomId: parseInt(roomId),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                rentAmount: parseFloat(rentAmount),
                depositPaid: parseFloat(depositPaid),
            },
        });
        res.redirect(`/agent/leases/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating lease.');
    }
};

exports.deleteLease = async (req, res) => {
    const lease = await prisma.lease.findUnique({ where: { id: parseInt(req.params.id) } });
    if (lease) {
        await prisma.room.update({
            where: { id: lease.roomId },
            data: { status: 'vacant' },
        });
        await prisma.lease.delete({ where: { id: parseInt(req.params.id) } });
    }
    res.redirect('/agent/leases');
};