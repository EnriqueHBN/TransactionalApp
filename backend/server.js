require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Connect to Database
connectDB();

const app = express();

// Middleware
// Middleware
app.use(cors());

// Webhook route must be before express.json() because it needs raw body
app.use('/api/webhook', require('./src/routes/webhookRoutes'));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this just in case

// Debug Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Define Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/transactions', require('./src/routes/transactionRoutes'));
app.use('/api/stripe', require('./src/routes/stripeRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
