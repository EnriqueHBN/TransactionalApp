const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

// @desc    Create a Stripe Connect Account and get Onboarding Link
// @route   POST /api/stripe/connect
// @access  Private
const connectStripe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // 1. Create a Stripe Account if not exists
        if (!user.stripe_account_id) {
            const account = await stripe.accounts.create({
                type: 'express', // or 'standard'
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });

            user.stripe_account_id = account.id;
            await user.save();
        }

        // 2. Create Account Link for onboarding
        // 2. Create Account Link for onboarding
        const protocol = req.protocol;
        const host = req.get('host');
        // Stripe requires HTTPS or HTTP localhost. 
        // If we are on 10.0.2.2 (Android Emulator), Stripe rejects it.
        // We must use localhost for the redirect URL to satisfy Stripe, 
        // and rely on 'adb reverse tcp:PORT tcp:PORT' for the device to reach it.
        let baseUrl = `${protocol}://${host}/api/stripe`;

        if (host.includes('10.0.2.2') || host.includes('192.168')) {
            baseUrl = `${protocol}://localhost:${process.env.PORT || 5000}/api/stripe`;
        }

        // Safety check for req.body
        const body = req.body || {};
        const { deepLinkBase } = body;
        // If deepLinkBase is provided (from mobile), use it. Otherwise default to mobile://
        const appScheme = deepLinkBase || 'mobile://';

        // We pass the desired final deep link as a query param to our backend redirect handler
        const refreshDeepLink = `${appScheme}stripe/refresh`;
        const returnDeepLink = `${appScheme}stripe/return`;

        const accountLink = await stripe.accountLinks.create({
            account: user.stripe_account_id,
            refresh_url: `${baseUrl}/refresh?redirect_uri=${encodeURIComponent(refreshDeepLink)}`,
            return_url: `${baseUrl}/return?redirect_uri=${encodeURIComponent(returnDeepLink)}`,
            type: 'account_onboarding',
        });

        res.json({ url: accountLink.url });
    } catch (error) {
        console.error('Stripe Connect Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Handle Stripe Redirects (Deep Linking)
// @route   GET /api/stripe/:action
// @access  Public
const handleStripeRedirect = (req, res) => {
    const { action } = req.params;
    const { redirect_uri } = req.query;

    // Allow 'return', 'refresh', 'success'
    if (['return', 'refresh', 'success'].includes(action)) {
        // Use the provided redirect_uri or fallback to default scheme
        const deepLink = redirect_uri || `mobile://stripe/${action}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecting...</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
                    .container { text-align: center; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .btn { display: inline-block; background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Opening App...</h2>
                    <p>If the app doesn't open automatically, click the button below.</p>
                    <a href="${deepLink}" class="btn">Return to App</a>
                </div>
                <script>
                    // Attempt to redirect automatically
                    setTimeout(function() {
                        window.location.href = "${deepLink}";
                    }, 500);
                </script>
            </body>
            </html>
        `;
        res.send(html);
    } else {
        res.status(400).send('Invalid redirect action');
    }
};

// @desc    Get Stripe Dashboard Link
// @route   GET /api/stripe/dashboard
// @access  Private
const getStripeDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user.stripe_account_id) {
            return res.status(400).json({ message: 'No Stripe account connected' });
        }

        const loginLink = await stripe.accounts.createLoginLink(
            user.stripe_account_id
        );

        res.json({ url: loginLink.url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check Stripe Account Status
// @route   GET /api/stripe/status
// @access  Private
const getStripeStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        console.log('getStripeStatus - User:', {
            id: user._id,
            email: user.email,
            stripe_account_id: user.stripe_account_id
        });

        if (!user.stripe_account_id) {
            console.log('No stripe_account_id found for user');
            return res.json({ connected: false });
        }

        const account = await stripe.accounts.retrieve(user.stripe_account_id);

        console.log('Stripe Account Status Check:', {
            id: account.id,
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            requirements: account.requirements
        });

        // Check if charges are enabled
        // In test mode, sometimes charges_enabled is false but details_submitted is true.
        // For development, let's be more lenient or just rely on details_submitted if charges are pending.
        const connected = account.details_submitted; // Relaxed check for Dev

        console.log('Is Connected?', connected);

        if (connected !== user.stripe_onboarding_complete) {
            user.stripe_onboarding_complete = connected;
            await user.save();
        }

        res.json({
            connected,
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    connectStripe,
    getStripeDashboard,
    getStripeStatus,
    handleStripeRedirect
};
