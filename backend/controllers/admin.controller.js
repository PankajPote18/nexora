const { User, Movie, SubscriptionPlan, SettingsPage } = require('../models');

// Dashboard Analytics
exports.getDashboardData = async (req, res) => {
    try {
        const [totalUsers, totalMovies, activeSubscriptions] = await Promise.all([
            User.count(),
            Movie.count(),
            SubscriptionPlan.count({ where: { status: true } })
        ]);

        res.json({
            metrics: {
                totalUsers,
                totalMovies,
                activeSubscriptions
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching dashboard data' });
    }
};

// User Management
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching users' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        await user.destroy();
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error deleting user' });
    }
};
