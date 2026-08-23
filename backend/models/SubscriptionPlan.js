const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    original_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    billing_cycle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    number_of_days: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_recommended: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Razorpay Plan id backing this SubscriptionPlan's recurring/autopay
    // option — created lazily on first use (see payment.controller.js's
    // createPayment) and cached here since Razorpay has no "get or create"
    // endpoint of its own; null until a customer first opts into autopay
    // for this plan.
    razorpay_plan_id: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'subscription_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SubscriptionPlan;
