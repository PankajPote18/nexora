const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const app = express();

// Middleware
app.use(compression()); // gzip/br every JSON response — was previously sent uncompressed
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// All uploaded media is served directly from Bunny Storage's CDN (see
// backend/utils/bunnyStorage.util.js) — there is no local uploads folder to
// serve statically here anymore.

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Node.js API' });
});

// Import Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/movies', require('./routes/movie.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/subscription-plans', require('./routes/subscriptionPlan.routes'));
app.use('/api/settings-pages', require('./routes/settingsPage.routes'));
app.use('/api/settings-menu', require('./routes/settingsMenu.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/master', require('./routes/master.routes'));
app.use('/api/hero-banners', require('./routes/heroBanner.routes'));
app.use('/api/trays', require('./routes/tray.routes'));
app.use('/api/payments', require('./routes/payment.routes'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;
