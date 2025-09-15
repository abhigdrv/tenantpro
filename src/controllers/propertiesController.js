// src/controllers/propertiesController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listProperties = async (req, res) => {
    const properties = await prisma.property.findMany({
        include: { rooms: true }
    });
    res.render('properties/list', { properties });
};

exports.newPropertyForm = (req, res) => {
    res.render('properties/form', { property: null, title: 'Add New Property' });
};

exports.createProperty = async (req, res) => {
    const { name, address, city, state, zipCode, description } = req.body;
    try {
        await prisma.property.create({
            data: {
                name,
                address,
                city,
                state,
                zipCode,
                description,
            },
        });
        res.redirect('/properties');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating property.');
    }
};

exports.viewProperty = async (req, res) => {
    const property = await prisma.property.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { rooms: true },
    });
    if (!property) {
        return res.status(404).send('Property not found.');
    }
    res.render('properties/view', { property });
};

exports.editPropertyForm = async (req, res) => {
    const property = await prisma.property.findUnique({
        where: { id: parseInt(req.params.id) },
    });
    if (!property) {
        return res.status(404).send('Property not found.');
    }
    res.render('properties/form', { property, title: 'Edit Property' });
};

exports.updateProperty = async (req, res) => {
    const { name, address, city, state, zipCode, description } = req.body;
    try {
        await prisma.property.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name,
                address,
                city,
                state,
                zipCode,
                description,
            },
        });
        res.redirect(`/properties/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating property.');
    }
};

exports.deleteProperty = async (req, res) => {
    try {
        await prisma.property.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/properties');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting property.');
    }
};

// Rooms Management
exports.newRoomForm = async (req, res) => {
    const propertyId = parseInt(req.params.id);
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
        return res.status(404).send('Property not found.');
    }
    res.render('properties/room_form', { room: null, property, title: 'Add New Room' });
};

exports.createRoom = async (req, res) => {
    const propertyId = parseInt(req.params.id);
    const { roomNumber, rentAmount } = req.body;
    try {
        await prisma.room.create({
            data: {
                propertyId,
                roomNumber,
                rentAmount: parseFloat(rentAmount),
            },
        });
        res.redirect(`/properties/${propertyId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating room.');
    }
};

exports.editRoomForm = async (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { property: true },
    });
    if (!room) {
        return res.status(404).send('Room not found.');
    }
    res.render('properties/room_form', { room, property: room.property, title: 'Edit Room' });
};

exports.updateRoom = async (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const { roomNumber, rentAmount, status } = req.body;
    try {
        await prisma.room.update({
            where: { id: roomId },
            data: {
                roomNumber,
                rentAmount: parseFloat(rentAmount),
                status,
            },
        });
        res.redirect(`/properties/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating room.');
    }
};

exports.deleteRoom = async (req, res) => {
    const roomId = parseInt(req.params.roomId);
    try {
        await prisma.room.delete({ where: { id: roomId } });
        res.redirect(`/properties/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting room.');
    }
};