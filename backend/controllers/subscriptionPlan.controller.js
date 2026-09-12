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

        // Razorpay Plans are immutable once created (their amount/period
        // can't be edited via Razorpay's API) — payment.controller.js's
        // createPayment lazily creates one on first payment and caches its
        // id here forever. Without clearing it on every edit, a price (or
        // billing_cycle) change here keeps silently charging whatever
        // amount was baked into the old, now-stale Razorpay Plan. The next
        // payment just lazily creates a fresh one with the current values.
        await plan.update({ ...req.body, razorpay_plan_id: null });
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
