const { SettingsMenu } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const activeOnly = req.query.active === '1';
        const where = activeOnly ? { status: true } : {};
        const items = await SettingsMenu.findAll({ where, order: [['sort_order', 'ASC']] });
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching menu items' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const item = await SettingsMenu.findByPk(req.params.id);
        if (!item) return res.status(404).json({ message: 'Menu item not found' });
        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching menu item details' });
    }
};

exports.create = async (req, res) => {
    try {
        const item = await SettingsMenu.create(req.body);
        res.status(201).json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating menu item' });
    }
};

exports.update = async (req, res) => {
    try {
        const item = await SettingsMenu.findByPk(req.params.id);
        if (!item) return res.status(404).json({ message: 'Menu item not found' });
        await item.update(req.body);
        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating menu item' });
    }
};

exports.remove = async (req, res) => {
    try {
        const item = await SettingsMenu.findByPk(req.params.id);
        if (!item) return res.status(404).json({ message: 'Menu item not found' });
        await item.destroy();
        res.json({ message: 'Menu item deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting menu item' });
    }
};

exports.reorder = async (req, res) => {
    try {
        const { items } = req.body; // Expects array of { id, sort_order }
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: 'Items array is required' });
        }
        
        for (const item of items) {
            await SettingsMenu.update(
                { sort_order: item.sort_order },
                { where: { id: item.id } }
            );
        }
        
        res.json({ message: 'Menu reordered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error reordering menu items' });
    }
};
