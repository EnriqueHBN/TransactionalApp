const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    stripe_payment_link_id: {
        type: String,
        required: true,
    },
    stripe_payment_intent_id: {
        type: String,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'USD',
    },
    description: {
        type: String,
    },
    status: {
        type: String,
        enum: ['PENDING', 'PAID', 'CANCELLED'],
        default: 'PENDING',
    },
    payment_url: {
        type: String,
        required: true,
    },
    history: [{
        status: String,
        changed_at: {
            type: Date,
            default: Date.now
        }
    }],
    created_at: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Transaction', TransactionSchema);
