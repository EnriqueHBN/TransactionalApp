const express = require('express');
const router = express.Router();
const {
    connectStripe,
    getStripeDashboard,
    getStripeStatus,
    handleStripeRedirect
} = require('../controllers/stripeController');
const { protect } = require('../middleware/authMiddleware');

router.post('/connect', protect, connectStripe);
router.get('/dashboard', protect, getStripeDashboard);
router.get('/status', protect, getStripeStatus);
router.get('/:action', handleStripeRedirect); // Public route for redirects

module.exports = router;
