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
    }
}, {
    tableName: 'subscription_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SubscriptionPlan;
