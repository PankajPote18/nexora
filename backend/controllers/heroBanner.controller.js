const { HeroBanner, Movie } = require('../models');
const crypto = require('crypto');

exports.getAll = async (req, res) => {
    try {
        const banners = await HeroBanner.findAll({
            include: [{ model: Movie, as: 'show', attributes: ['title'] }],
            order: [['sorting_position', 'ASC']]
        });
        res.json(banners);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching hero banners', error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (!payload.id) {
            payload.id = crypto.randomUUID();
        }
        const banner = await HeroBanner.create(payload);
        res.status(201).json(banner);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating hero banner', error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const banner = await HeroBanner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: 'Hero banner not found' });
        await banner.update(req.body);
        res.json(banner);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating hero banner', error: err.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const banner = await HeroBanner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: 'Hero banner not found' });
        await banner.destroy();
        res.json({ message: 'Hero banner deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting hero banner', error: err.message });
    }
};
