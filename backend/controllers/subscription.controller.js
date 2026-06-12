const { Subscription } = require('../models');

// Get all plans (dummy implementation, usually comes from Stripe/PayPal or a Plans table)
exports.getPlans = async (req, res) => {
    try {
        const plans = [
            { id: 1, name: 'Basic', price: 9.99, duration_months: 1 },
            { id: 2, name: 'Premium', price: 99.99, duration_months: 12 }
        ];
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching plans' });
    }
};

// Purchase subscription
exports.purchaseSubscription = async (req, res) => {
    try {
        const { plan_name, amount, duration_months } = req.body;
        
        const start_date = new Date();
        const end_date = new Date();
        end_date.setMonth(end_date.getMonth() + parseInt(duration_months || 1));

        const subscription = await Subscription.create({
            user_id: req.user.id,
            plan_name,
            amount,
            status: 'active',
            start_date,
            end_date
        });

        res.status(201).json({ message: 'Subscription purchased successfully', subscription });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during purchase' });
    }
};
