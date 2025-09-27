const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session store
// ⚠️ Note: For production, replace MemoryStore with Redis or DynamoDB
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const propertyRoutes = require('./routes/properties');
const tenantRoutes = require('./routes/tenants');
const leaseRoutes = require('./routes/leases');
const paymentRoutes = require('./routes/payments');
const maintenanceRoutes = require('./routes/maintenance');

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Use routes
app.use('/', authRoutes);
app.use('/dashboard', requireAuth, dashboardRoutes);
app.use('/properties', requireAuth, propertyRoutes);
app.use('/tenants', requireAuth, tenantRoutes);
app.use('/leases', requireAuth, leaseRoutes);
app.use('/payments', requireAuth, paymentRoutes);
app.use('/maintenance', requireAuth, maintenanceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page Not Found');
});

module.exports = app;