const { Genre, Language, AgeCertificate, MatureTheme, Badge, Vendor } = require('../models');

// A generic controller factory to handle CRUD for any master table model
const createMasterController = (Model) => {
    return {
        getAll: async (req, res) => {
            try {
                const items = await Model.findAll({ order: [['sort_order', 'ASC']] });
                res.json(items);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        getById: async (req, res) => {
            try {
                const item = await Model.findByPk(req.params.id);
                if (item) {
                    res.json(item);
                } else {
                    res.status(404).json({ message: 'Item not found' });
                }
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        create: async (req, res) => {
            try {
                const newItem = await Model.create(req.body);
                res.status(201).json(newItem);
            } catch (error) {
                res.status(400).json({ message: error.message });
            }
        },
        update: async (req, res) => {
            try {
                const item = await Model.findByPk(req.params.id);
                if (item) {
                    await item.update(req.body);
                    res.json(item);
                } else {
                    res.status(404).json({ message: 'Item not found' });
                }
            } catch (error) {
                res.status(400).json({ message: error.message });
            }
        },
        delete: async (req, res) => {
            try {
                const item = await Model.findByPk(req.params.id);
                if (item) {
                    await item.destroy();
                    res.json({ message: 'Item deleted' });
                } else {
                    res.status(404).json({ message: 'Item not found' });
                }
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        }
    };
};

module.exports = {
    genreController: createMasterController(Genre),
    languageController: createMasterController(Language),
    ageCertificateController: createMasterController(AgeCertificate),
    matureThemeController: createMasterController(MatureTheme),
    badgeController: createMasterController(Badge),
    // Vendor doesn't have sort_order in model right now, so we need a slightly customized getAll for Vendor
    vendorController: {
        ...createMasterController(Vendor),
        getAll: async (req, res) => {
            try {
                const items = await Vendor.findAll();
                res.json(items);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        }
    }
};
