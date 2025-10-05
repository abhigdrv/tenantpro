// src/controllers/tenantsController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listTenants = async (req, res) => {
    const tenants = await prisma.tenant.findMany({
        orderBy: { lastName: 'asc' }
    });
    res.render('tenants/list', { tenants });
};

exports.newTenantForm = (req, res) => {
    res.render('tenants/form', { tenant: null, title: 'Add New Tenant' });
};

exports.createTenant = async (req, res) => {
    const { firstName, lastName, email, phone, dob } = req.body;
    try {
        await prisma.tenant.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                dob: dob ? new Date(dob) : null,
            },
        });
        res.redirect('/agent/tenants');
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') { // Prisma error code for unique constraint violation
            return res.status(409).send('Error: A tenant with this email already exists.');
        }
        res.status(500).send('Error creating tenant.');
    }
};

exports.viewTenant = async (req, res) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { leases: { include: { room: { include: { property: true } } } } },
    });
    if (!tenant) {
        return res.status(404).send('Tenant not found.');
    }
    res.render('tenants/view', { tenant });
};

exports.editTenantForm = async (req, res) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: parseInt(req.params.id) },
    });
    if (!tenant) {
        return res.status(404).send('Tenant not found.');
    }
    res.render('tenants/form', { tenant, title: 'Edit Tenant' });
};

exports.updateTenant = async (req, res) => {
    const { firstName, lastName, email, phone, dob } = req.body;
    try {
        await prisma.tenant.update({
            where: { id: parseInt(req.params.id) },
            data: {
                firstName,
                lastName,
                email,
                phone,
                dob: dob ? new Date(dob) : null,
            },
        });
        res.redirect(`/agent/tenants/${req.params.id}`);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(409).send('Error: A tenant with this email already exists.');
        }
        res.status(500).send('Error updating tenant.');
    }
};

exports.deleteTenant = async (req, res) => {
    try {
        await prisma.tenant.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/agent/tenants');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting tenant.');
    }
};