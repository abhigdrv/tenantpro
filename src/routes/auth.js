// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// GET / - Redirect to login
router.get('/', (req, res) => {
    res.redirect('/login');
});

// GET /login - Login Page
router.get('/login', (req, res) => {
    res.render('auth/login', { error: req.query.error });
});

// POST /login - Handle Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.redirect('/login?error=Invalid email or password');
    }

    req.session.userId = user.id;
    res.redirect('/dashboard');
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
        res.redirect('/dashboard');
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