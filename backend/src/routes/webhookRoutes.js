const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/webhookController');

// This route needs raw body, which we will handle in server.js or here
router.post('/', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = router;
