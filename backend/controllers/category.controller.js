const { Category } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const categories = await Category.findAll({ order: [['created_at', 'DESC']] });
        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching category details' });
    }
};

exports.create = async (req, res) => {
    try {
        const category = await Category.create(req.body);
        res.status(201).json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating category' });
    }
};

exports.update = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        await category.update(req.body);
        res.json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating category' });
    }
};

exports.remove = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        await category.destroy();
        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting category' });
    }
};
