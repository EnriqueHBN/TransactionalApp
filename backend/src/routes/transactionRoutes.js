const express = require('express');
const router = express.Router();
const {
    createPaymentLink,
    getTransactions,
    getMetrics
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-link', protect, createPaymentLink);
router.get('/', protect, getTransactions);
router.get('/metrics', protect, getMetrics);

module.exports = router;
