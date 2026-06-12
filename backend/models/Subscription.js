const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Subscription = sequelize.define('Subscription', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    plan_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'cancelled'),
        defaultValue: 'active'
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Subscription;
