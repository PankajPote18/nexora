const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

// Tracks a customer's active plan and (optionally) their PayU UPI Autopay
// mandate for auto-renewal — see CLAUDE.md §9/§22 and the autopay billing
// pipeline in backend/jobs|queues|workers/autopayBilling.* +
// services/autopayBilling.service.js. No real backend user auth exists for
// the consumer flow (§8), so identity here is customer_phone/email, matching
// the Payment model's existing convention — not a foreign key to `users`.
const Subscription = sequelize.define('Subscription', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    customer_phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customer_email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    plan_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active' // active | expired | cancelled
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    autopay_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    // The registration payment's payu_mihpayid — PayU's si_transaction API
    // calls this "authpayuid" and requires it for every subsequent recurring
    // charge (see payu.util.js's triggerRecurringCharge).
    payu_mandate_ref: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mandate_status: {
        type: DataTypes.STRING,
        allowNull: true // pending | active | failed | cancelled
    },
    last_billed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    last_payment_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    failed_attempt_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Subscription;
