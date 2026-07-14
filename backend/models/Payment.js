const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    txnid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    plan_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    customer_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customer_email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customer_phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UPI'
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending' // pending | success | failed | cancelled
    },
    payu_mihpayid: {
        type: DataTypes.STRING,
        allowNull: true
    },
    payu_reference_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    payu_bank_ref_num: {
        type: DataTypes.STRING,
        allowNull: true
    },
    payu_mode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    payu_response: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    error_message: {
        type: DataTypes.STRING,
        allowNull: true
    },
    last_verified_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Payment;
