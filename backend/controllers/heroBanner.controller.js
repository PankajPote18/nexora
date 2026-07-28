const { HeroBanner, Movie } = require('../models');
const crypto = require('crypto');

exports.getAll = async (req, res) => {
    try {
        const where = req.query.active === '1' ? { status: true } : {};
        const banners = await HeroBanner.findAll({
            where,
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
        
        // Re-sequence remaining banners so there are no gaps
        const remainingBanners = await HeroBanner.findAll({ order: [['sorting_position', 'ASC']] });
        for (let i = 0; i < remainingBanners.length; i++) {
            if (remainingBanners[i].sorting_position !== i + 1) {
                await remainingBanners[i].update({ sorting_position: i + 1 });
            }
        }
        
        res.json({ message: 'Hero banner deleted and positions updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting hero banner', error: err.message });
    }
};
