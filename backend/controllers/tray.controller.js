const { Tray } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const trays = await Tray.findAll({
            order: [['sorting_position', 'ASC']]
        });
        res.json(trays);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching trays', error: err.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const tray = await Tray.findByPk(req.params.id);
        if (!tray) return res.status(404).json({ message: 'Tray not found' });
        res.json(tray);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching tray', error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const tray = await Tray.create(req.body);
        res.status(201).json(tray);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating tray', error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const tray = await Tray.findByPk(req.params.id);
        if (!tray) return res.status(404).json({ message: 'Tray not found' });
        
        await tray.update(req.body);
        res.json(tray);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating tray', error: err.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const tray = await Tray.findByPk(req.params.id);
        if (!tray) return res.status(404).json({ message: 'Tray not found' });
        
        await tray.destroy();
        
        // Re-sequence remaining trays so there are no gaps
        const remainingTrays = await Tray.findAll({ order: [['sorting_position', 'ASC']] });
        for (let i = 0; i < remainingTrays.length; i++) {
            if (remainingTrays[i].sorting_position !== i + 1) {
                await remainingTrays[i].update({ sorting_position: i + 1 });
            }
        }
        
        res.json({ message: 'Tray deleted and positions updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting tray', error: err.message });
    }
};
