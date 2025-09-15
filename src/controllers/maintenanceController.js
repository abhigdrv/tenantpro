// src/controllers/maintenanceController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listRequests = async (req, res) => {
    const requests = await prisma.maintenanceRequest.findMany({
        include: {
            tenant: true,
            property: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    res.render('maintenance/list', { requests });
};

exports.newRequestForm = async (req, res) => {
    const tenants = await prisma.tenant.findMany();
    const properties = await prisma.property.findMany();
    res.render('maintenance/form', { request: null, tenants, properties, title: 'Submit New Request' });
};

exports.createRequest = async (req, res) => {
    const { tenantId, propertyId, title, description, priority } = req.body;
    try {
        await prisma.maintenanceRequest.create({
            data: {
                tenantId: parseInt(tenantId),
                propertyId: parseInt(propertyId),
                title,
                description,
                priority,
                status: 'open',
            },
        });
        res.redirect('/maintenance');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error submitting maintenance request.');
    }
};

exports.viewRequest = async (req, res) => {
    const request = await prisma.maintenanceRequest.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
            tenant: true,
            property: true,
        },
    });
    if (!request) {
        return res.status(404).send('Request not found.');
    }
    res.render('maintenance/view', { request });
};

exports.editRequestForm = async (req, res) => {
    const request = await prisma.maintenanceRequest.findUnique({
        where: { id: parseInt(req.params.id) },
    });
    const tenants = await prisma.tenant.findMany();
    const properties = await prisma.property.findMany();
    if (!request) {
        return res.status(404).send('Request not found.');
    }
    res.render('maintenance/form', { request, tenants, properties, title: 'Edit Maintenance Request' });
};

exports.updateRequest = async (req, res) => {
    const { tenantId, propertyId, title, description, priority, status } = req.body;
    try {
        await prisma.maintenanceRequest.update({
            where: { id: parseInt(req.params.id) },
            data: {
                tenantId: parseInt(tenantId),
                propertyId: parseInt(propertyId),
                title,
                description,
                priority,
                status,
            },
        });
        res.redirect(`/maintenance/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating maintenance request.');
    }
};

exports.deleteRequest = async (req, res) => {
    try {
        await prisma.maintenanceRequest.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/maintenance');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting maintenance request.');
    }
};