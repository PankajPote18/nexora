const { User, Subscription } = require('../models');

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = name || user.name;
        await user.save();

        res.json({ message: 'Profile updated successfully', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// Get user subscription status
exports.getSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { user_id: req.user.id, status: 'active' },
            order: [['end_date', 'DESC']]
        });

        if (!subscription) {
            return res.status(200).json({ message: 'No active subscription', subscription: null });
        }

        res.json({ subscription });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching subscription' });
    }
};
