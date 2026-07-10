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
        
        const { sequelize } = require('../config/db.config');
        
        let updates = [];
        let replacements = [];
        
        if (req.body.title !== undefined) { updates.push('title = ?'); replacements.push(req.body.title); }
        if (req.body.sorting_position !== undefined) { updates.push('sorting_position = ?'); replacements.push(req.body.sorting_position); }
        if (req.body.shape !== undefined) { updates.push('shape = ?'); replacements.push(req.body.shape); }
        if (req.body.aspect_ratio !== undefined) { updates.push('aspect_ratio = ?'); replacements.push(req.body.aspect_ratio); }
        if (req.body.status !== undefined) { updates.push('status = ?'); replacements.push(req.body.status); }
        if (req.body.shows !== undefined) { 
            updates.push('shows = ?'); 
            replacements.push(JSON.stringify(req.body.shows)); 
        }
        
        if (updates.length > 0) {
            replacements.push(req.params.id);
            await sequelize.query(`UPDATE trays SET ${updates.join(', ')} WHERE id = ?`, {
                replacements: replacements
            });
        }
        
        const updatedTray = await Tray.findByPk(req.params.id);
        res.json(updatedTray);
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
