const { Audio } = require('../models');
const { Op } = require('sequelize');

// List all audio contents with optional search and filters
exports.listAudio = async (req, res) => {
    try {
        const { search, category_id, limit = 20, page = 1 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = {};

        if (search) {
            whereClause.title = { [Op.like]: `%${search}%` };
        }
        if (category_id) {
            whereClause.category_id = category_id;
        }

        const { count, rows } = await Audio.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            audio: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching audio list' });
    }
};

// Get audio details
exports.getAudioDetails = async (req, res) => {
    try {
        const audio = await Audio.findByPk(req.params.id);
        if (!audio) {
            return res.status(404).json({ message: 'Audio not found' });
        }
        res.json(audio);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching audio details' });
    }
};

// Get trending audio
exports.getTrendingAudio = async (req, res) => {
    try {
        const trending = await Audio.findAll({
            where: { is_trending: true },
            limit: 10,
            order: [['play_count', 'DESC']]
        });
        res.json(trending);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching trending audio' });
    }
};

// Increment play count (listening progress/player logic)
exports.incrementPlayCount = async (req, res) => {
    try {
        const audio = await Audio.findByPk(req.params.id);
        if (!audio) {
            return res.status(404).json({ message: 'Audio not found' });
        }
        
        audio.play_count += 1;
        await audio.save();

        res.json({ message: 'Play count updated', play_count: audio.play_count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating play count' });
    }
};
