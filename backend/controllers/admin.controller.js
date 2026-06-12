const { User, Audio, Subscription, CmsPage } = require('../models');

// Dashboard Analytics
exports.getDashboardData = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalAudio = await Audio.count();
        const totalSubscriptions = await Subscription.count({ where: { status: 'active' } });

        res.json({
            metrics: {
                totalUsers,
                totalAudio,
                activeSubscriptions: totalSubscriptions
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

// Audio Management
exports.createAudio = async (req, res) => {
    try {
        const audio = await Audio.create(req.body);
        res.status(201).json(audio);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error creating audio' });
    }
};

exports.deleteAudio = async (req, res) => {
    try {
        const audio = await Audio.findByPk(req.params.id);
        if (!audio) return res.status(404).json({ message: 'Audio not found' });
        
        await audio.destroy();
        res.json({ message: 'Audio deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error deleting audio' });
    }
};

// CMS Management
exports.updateCmsPage = async (req, res) => {
    try {
        const page = await CmsPage.findByPk(req.params.id);
        if (!page) return res.status(404).json({ message: 'CMS page not found' });
        
        await page.update(req.body);
        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating CMS page' });
    }
};
