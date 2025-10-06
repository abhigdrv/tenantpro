// src/controllers/contactsController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// View all contact messages (Admin only)
exports.listContacts =  async (req, res) => {
    try {
        const { status } = req.query;
        
        const whereClause = status ? { status } : {};
        
        const messages = await prisma.contactMessage.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        const stats = {
            total: await prisma.contactMessage.count(),
            unread: await prisma.contactMessage.count({ where: { status: 'unread' } }),
            read: await prisma.contactMessage.count({ where: { status: 'read' } }),
            responded: await prisma.contactMessage.count({ where: { status: 'responded' } })
        };
        
        res.render('contact/index', { messages, stats, currentFilter: status || 'all' });
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).send('Error loading contact messages');
    }
};

// Mark message as read
exports.markRead =  async (req, res) => {
    try {
        const { id } = req.params;
        
        await prisma.contactMessage.update({
            where: { id: parseInt(id) },
            data: {
                status: 'read',
                readAt: new Date()
            }
        });
        
        res.redirect('/agent/contacts');
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).send('Error updating message');
    }
};

// Mark message as responded
exports.markResponded = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        
        await prisma.contactMessage.update({
            where: { id: parseInt(id) },
            data: {
                status: 'responded',
                notes: notes || null
            }
        });
        
        res.redirect('/agent/contacts');
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).send('Error updating message');
    }
};

// Delete contact message
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        
        await prisma.contactMessage.delete({
            where: { id: parseInt(id) }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ success: false, error: 'Error deleting message' });
    }
};

// Get single contact message details
exports.getContactDetail = async (req, res) => {
    try {
        const { id } = req.params;
        
        const message = await prisma.contactMessage.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!message) {
            return res.status(404).send('Message not found');
        }
        
        // Mark as read if it's unread
        if (message.status === 'unread') {
            await prisma.contactMessage.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'read',
                    readAt: new Date()
                }
            });
            message.status = 'read';
        }
        
        res.render('agent/contact-detail', { message });
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).send('Error loading message');
    }
};