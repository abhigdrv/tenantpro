// src/app.js (updated)
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const port = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Public folder for static assets (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const propertyRoutes = require('./routes/properties');
const tenantRoutes = require('./routes/tenants');
const leaseRoutes = require('./routes/leases');
const paymentRoutes = require('./routes/payments');
const maintenanceRoutes = require('./routes/maintenance');

const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

app.use('/', authRoutes);
app.use('/agent/dashboard', requireAuth, dashboardRoutes);
app.use('/agent/properties', requireAuth, propertyRoutes);
app.use('/agent/tenants', requireAuth, tenantRoutes);
app.use('/agent/leases', requireAuth, leaseRoutes);
app.use('/agent/payments', requireAuth, paymentRoutes);
app.use('/agent/maintenance', requireAuth, maintenanceRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});