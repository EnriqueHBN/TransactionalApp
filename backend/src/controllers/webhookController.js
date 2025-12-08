const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../models/Transaction');

const handleStripeWebhook = async (req, res) => {
    console.log('Webhook received!');
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // req.body must be a raw buffer here
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('Payment Session Completed:', session.id);

            // Find transaction by payment link ID
            // The session object has a 'payment_link' field if it was created from a Payment Link
            if (session.payment_link) {
                try {
                    const transaction = await Transaction.findOne({
                        stripe_payment_link_id: session.payment_link
                    });

                    if (transaction) {
                        transaction.status = 'PAID';
                        transaction.history.push({
                            status: 'PAID',
                            timestamp: new Date()
                        });
                        await transaction.save();
                        console.log(`Transaction ${transaction._id} updated to PAID`);
                    } else {
                        console.log(`No transaction found for Payment Link ID: ${session.payment_link}`);
                    }
                } catch (error) {
                    console.error('Error updating transaction:', error);
                }
            }
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
};

module.exports = { handleStripeWebhook };
