require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const adminRoutes = require('./routes/admin_routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database Connection
connectDB();

// Routes
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('Munawwara Care Admin Backend Running');
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Admin Server running on port ${PORT}`);
});
