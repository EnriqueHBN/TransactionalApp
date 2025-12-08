const Transaction = require('../models/Transaction');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create a Stripe Payment Link
// @route   POST /api/transactions/create-link
// @access  Private
const createPaymentLink = async (req, res) => {
    const { amount, description, currency = 'usd' } = req.body;

    if (!amount) {
        return res.status(400).json({ message: 'Amount is required' });
    }

    if (!req.user.stripe_account_id) {
        return res.status(400).json({ message: 'Please connect your Stripe account first' });
    }

    try {
        // Create a product and price on the fly (or use existing ones)
        // For simplicity, we create a price object directly in the checkout session or payment link
        // However, Payment Links API requires a Price ID.

        // 1. Create Price
        const price = await stripe.prices.create({
            currency: currency,
            unit_amount: amount * 100, // Stripe expects cents
            product_data: {
                name: description || 'Payment',
            },
        }, {
            stripeAccount: req.user.stripe_account_id,
        });

        // 2. Create Payment Link
        const protocol = req.protocol;
        const host = req.get('host');
        let baseUrl = `${protocol}://${host}/api/stripe`;

        if (host.includes('10.0.2.2') || host.includes('192.168')) {
            baseUrl = `${protocol}://localhost:${process.env.PORT || 5000}/api/stripe`;
        }

        const { deepLinkBase } = req.body;
        const appScheme = deepLinkBase || 'mobile://';
        const successDeepLink = `${appScheme}stripe/success`;

        const paymentLink = await stripe.paymentLinks.create({
            line_items: [
                {
                    price: price.id,
                    quantity: 1,
                },
            ],
            after_completion: {
                type: 'redirect',
                redirect: {
                    url: `${baseUrl}/success?redirect_uri=${encodeURIComponent(successDeepLink)}`,
                },
            },
        }, {
            stripeAccount: req.user.stripe_account_id,
        });

        // 3. Save Transaction to DB
        const transaction = await Transaction.create({
            user_id: req.user.id,
            stripe_payment_link_id: paymentLink.id,
            amount: amount,
            currency: currency,
            description: description,
            payment_url: paymentLink.url,
            status: 'PENDING',
            history: [{ status: 'PENDING' }]
        });

        res.status(201).json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all transactions for user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
    try {
        // 1. Find all PENDING transactions for this user
        const pendingTransactions = await Transaction.find({
            user_id: req.user.id,
            status: 'PENDING'
        });

        // 2. Check Stripe for updates on these transactions
        for (const transaction of pendingTransactions) {
            if (transaction.stripe_payment_link_id) {
                try {
                    // List sessions for this payment link
                    const sessions = await stripe.checkout.sessions.list({
                        payment_link: transaction.stripe_payment_link_id,
                        limit: 5, // Check last 5 sessions
                    }, {
                        stripeAccount: req.user.stripe_account_id
                    });

                    // Check if any session is paid
                    const paidSession = sessions.data.find(s => s.payment_status === 'paid');

                    if (paidSession) {
                        transaction.status = 'PAID';
                        transaction.history.push({
                            status: 'PAID',
                            timestamp: new Date()
                        });
                        await transaction.save();
                        console.log(`Lazy Sync: Transaction ${transaction._id} updated to PAID`);
                    }
                } catch (err) {
                    console.error(`Error checking Stripe for transaction ${transaction._id}:`, err.message);
                }
            }
        }

        // 3. Return updated list
        const transactions = await Transaction.find({ user_id: req.user.id }).sort({
            created_at: -1,
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get transaction metrics
// @route   GET /api/transactions/metrics
// @access  Private
const getMetrics = async (req, res) => {
    try {
        // 1. Sync Pending Transactions (Same logic as getTransactions)
        const pendingTransactions = await Transaction.find({
            user_id: req.user.id,
            status: 'PENDING'
        });

        for (const transaction of pendingTransactions) {
            if (transaction.stripe_payment_link_id) {
                try {
                    const sessions = await stripe.checkout.sessions.list({
                        payment_link: transaction.stripe_payment_link_id,
                        limit: 5,
                    }, {
                        stripeAccount: req.user.stripe_account_id
                    });

                    const paidSession = sessions.data.find(s => s.payment_status === 'paid');

                    if (paidSession) {
                        transaction.status = 'PAID';
                        transaction.history.push({ status: 'PAID', timestamp: new Date() });
                        await transaction.save();
                    }
                } catch (err) {
                    console.error(`Error checking Stripe for transaction ${transaction._id}:`, err.message);
                }
            }
        }

        // 2. Calculate Metrics
        const transactions = await Transaction.find({ user_id: req.user.id });

        const totalSales = transactions
            .filter(t => t.status === 'PAID')
            .reduce((acc, curr) => acc + curr.amount, 0);

        const count = transactions.length;
        const paidCount = transactions.filter(t => t.status === 'PAID').length;

        res.json({
            totalSales,
            count,
            paidCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createPaymentLink,
    getTransactions,
    getMetrics
};
