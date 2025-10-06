// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
// Contact form submission handler
router.post('/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.render('index', {
                properties: await prisma.property.findMany({
                    include: { rooms: true }
                }),
                filters: {},
                contactError: 'Please fill in all required fields.',
                contactSuccess: false
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('index', {
                properties: await prisma.property.findMany({
                    include: { rooms: true }
                }),
                filters: {},
                contactError: 'Please provide a valid email address.',
                contactSuccess: false
            });
        }

        // Here you can:
        // 1. Save to database (create a ContactMessage model in Prisma)
        // 2. Send email notification
        // 3. Send to CRM system
        // 4. Log for later review

        // Example: Save to database (add ContactMessage model to your schema)
        await prisma.contactMessage.create({
            data: {
                name,
                email,
                phone: phone || null,
                message,
                createdAt: new Date()
            }
        });

        // Example: Send email notification using nodemailer (optional)
        // const nodemailer = require('nodemailer');
        // const transporter = nodemailer.createTransport({
        //     service: 'gmail',
        //     auth: {
        //         user: process.env.EMAIL_USER,
        //         pass: process.env.EMAIL_PASS
        //     }
        // });
        // 
        // await transporter.sendMail({
        //     from: process.env.EMAIL_USER,
        //     to: 'info@pgdhundho.com',
        //     subject: `New Contact Form Submission from ${name}`,
        //     html: `
        //         <h2>New Contact Form Submission</h2>
        //         <p><strong>Name:</strong> ${name}</p>
        //         <p><strong>Email:</strong> ${email}</p>
        //         <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        //         <p><strong>Message:</strong></p>
        //         <p>${message}</p>
        //     `
        // });

        // For now, just log it
        console.log('Contact form submission:', {
            name,
            email,
            phone,
            message,
            timestamp: new Date()
        });

        // Redirect back to homepage with success message
        // Use anchor to scroll to contact section
        const properties = await prisma.property.findMany({
            include: { rooms: true }
        });

        res.render('home/index', {
            properties,
            filters: {},
            contactSuccess: true,
            contactError: null
        });

    } catch (error) {
        console.error('Contact form error:', error);
        
        const properties = await prisma.property.findMany({
            include: { rooms: true }
        });

        res.render('home/index', {
            properties,
            filters: {},
            contactError: 'An error occurred. Please try again later.',
            contactSuccess: false
        });
    }
});

// GET / - Redirect to login
router.get('/', async (req, res) => {
    const { city, state, minRent, maxRent } = req.query;
    
    let whereClause = {};
    if (city) whereClause.city = { contains: city};
    if (state) whereClause.state = { contains: state};
    
    const properties = await prisma.property.findMany({
        where: whereClause,
        include: { rooms: true }
    });
    
    // Filter by rent if specified
    let filteredProperties = properties;
    if (minRent || maxRent) {
        filteredProperties = properties.filter(prop => {
            const rents = prop.rooms.map(r => r.rentAmount);
            const minPropRent = Math.min(...rents);
            if (minRent && minPropRent < parseFloat(minRent)) return false;
            if (maxRent && minPropRent > parseFloat(maxRent)) return false;
            return true;
        });
    }
    
    res.render('home/index', { 
        properties: filteredProperties, 
        filters: req.query,
        contactSuccess: false,
        contactError: null
    });
});

router.get('/properties/:id', async (req, res) => {
    try {
        const property = await prisma.property.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { 
                rooms: {
                    orderBy: {
                        roomNumber: 'asc'
                    }
                }
            },
        });
        
        if (!property) {
            return res.status(404).send('Property not found.');
        }
        
        res.render('home/properties', { property });
    } catch (error) {
        console.error('Error fetching property:', error);
        res.status(500).send('Error loading property details.');
    }
});

// GET /login - Login Page
router.get('/login', (req, res) => {
    res.render('auth/login', { error: req.query.error || '', redirect: req.query.redirect || '' });
});

// POST /login - Handle Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.redirect('/login?error=Invalid email or password');
    }

    req.session.userId = user.id;
    const redirectUrl = req.query.redirect || '/';

    res.redirect(redirectUrl);
});

// GET /register - Registration Page
router.get('/register', (req, res) => {
    res.render('auth/register');
});

// POST /register - Handle Registration
router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName
            },
        });
        req.session.userId = newUser.id;
        res.redirect('/agent/dashboard');
    } catch (error) {
        res.render('auth/register', { error: 'Email already exists.' });
    }
});

// GET /logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;