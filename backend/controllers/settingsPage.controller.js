const { SettingsPage } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const pages = await SettingsPage.findAll({ order: [['created_at', 'DESC']] });
        res.json(pages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching pages' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const page = await SettingsPage.findByPk(req.params.id);
        if (!page) return res.status(404).json({ message: 'Page not found' });
        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching page details' });
    }
};

exports.getBySlug = async (req, res) => {
    try {
        const page = await SettingsPage.findOne({ where: { slug: req.params.slug } });
        if (!page) return res.status(404).json({ message: 'Page not found' });
        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching page details' });
    }
};

exports.create = async (req, res) => {
    try {
        const page = await SettingsPage.create(req.body);
        res.status(201).json(page);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating page' });
    }
};

exports.update = async (req, res) => {
    try {
        const page = await SettingsPage.findByPk(req.params.id);
        if (!page) return res.status(404).json({ message: 'Page not found' });
        await page.update(req.body);
        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating page' });
    }
};

exports.remove = async (req, res) => {
    try {
        const page = await SettingsPage.findByPk(req.params.id);
        if (!page) return res.status(404).json({ message: 'Page not found' });
        await page.destroy();
        res.json({ message: 'Page deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting page' });
    }
};
