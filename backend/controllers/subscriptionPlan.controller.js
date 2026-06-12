const { SubscriptionPlan } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const activeOnly = req.query.active === '1';
        const where = activeOnly ? { status: true } : {};
        const plans = await SubscriptionPlan.findAll({ where, order: [['sort_order', 'ASC']] });
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching subscription plans' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        res.json(plan);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching plan details' });
    }
};

exports.create = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.create(req.body);
        res.status(201).json(plan);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating plan' });
    }
};

exports.update = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        await plan.update(req.body);
        res.json(plan);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating plan' });
    }
};

exports.remove = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        await plan.destroy();
        res.json({ message: 'Plan deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting plan' });
    }
};

exports.toggle = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        await plan.update({ status: !plan.status });
        res.json(plan);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error toggling plan' });
    }
};
