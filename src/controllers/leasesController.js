// src/controllers/leasesController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/lease-documents');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images and documents (PDF, DOC, DOCX) are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

exports.uploadMiddleware = upload.array('documents', 10); // Allow up to 10 files

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
    const { tenantId, roomId, startDate, endDate, rentAmount, depositPaid, documentTypes, descriptions } = req.body;
    try {
        const lease = await prisma.lease.create({
            data: {
                tenantId: parseInt(tenantId),
                roomId: parseInt(roomId),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                rentAmount: parseFloat(rentAmount),
                depositPaid: parseFloat(depositPaid),
            },
        });

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            const documentData = req.files.map((file, index) => ({
                leaseId: lease.id,
                documentType: Array.isArray(documentTypes) ? documentTypes[index] : documentTypes || 'other',
                fileName: file.originalname,
                filePath: file.path,
                description: Array.isArray(descriptions) ? descriptions[index] : descriptions || null
            }));

            await prisma.leaseDocument.createMany({
                data: documentData
            });
        }

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
            documents: { orderBy: { uploadedAt: 'desc' } }
        },
    });
    if (!lease) {
        return res.status(404).send('Lease not found.');
    }
    res.render('leases/view', { lease });
};

exports.editLeaseForm = async (req, res) => {
    const lease = await prisma.lease.findUnique({ 
        where: { id: parseInt(req.params.id) },
        include: { documents: true }
    });
    const tenants = await prisma.tenant.findMany();
    const rooms = await prisma.room.findMany({ include: { property: true } });
    if (!lease) {
        return res.status(404).send('Lease not found.');
    }
    res.render('leases/form', { lease, tenants, rooms, title: 'Edit Lease' });
};

exports.updateLease = async (req, res) => {
    const { tenantId, roomId, startDate, endDate, rentAmount, depositPaid, documentTypes, descriptions } = req.body;
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

        // Handle new file uploads
        if (req.files && req.files.length > 0) {
            const documentData = req.files.map((file, index) => ({
                leaseId: parseInt(req.params.id),
                documentType: Array.isArray(documentTypes) ? documentTypes[index] : documentTypes || 'other',
                fileName: file.originalname,
                filePath: file.path,
                description: Array.isArray(descriptions) ? descriptions[index] : descriptions || null
            }));

            await prisma.leaseDocument.createMany({
                data: documentData
            });
        }

        res.redirect(`/agent/leases/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating lease.');
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const document = await prisma.leaseDocument.findUnique({
            where: { id: parseInt(req.params.documentId) }
        });

        if (document) {
            // Delete file from filesystem
            try {
                await fs.unlink(document.filePath);
            } catch (err) {
                console.error('Error deleting file:', err);
            }

            // Delete from database
            await prisma.leaseDocument.delete({
                where: { id: parseInt(req.params.documentId) }
            });
        }

        res.redirect(`/agent/leases/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting document.');
    }
};

exports.downloadDocument = async (req, res) => {
    try {
        const document = await prisma.leaseDocument.findUnique({
            where: { id: parseInt(req.params.documentId) }
        });

        if (!document) {
            return res.status(404).send('Document not found.');
        }

        res.download(document.filePath, document.fileName);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error downloading document.');
    }
};

exports.deleteLease = async (req, res) => {
    const lease = await prisma.lease.findUnique({ 
        where: { id: parseInt(req.params.id) },
        include: { documents: true }
    });
    
    if (lease) {
        // Delete all associated documents from filesystem
        for (const doc of lease.documents) {
            try {
                await fs.unlink(doc.filePath);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }

        await prisma.room.update({
            where: { id: lease.roomId },
            data: { status: 'vacant' },
        });
        
        await prisma.lease.delete({ where: { id: parseInt(req.params.id) } });
    }
    res.redirect('/agent/leases');
};