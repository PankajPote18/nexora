const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

// Tracks a customer's active plan and (optionally) their Razorpay
// Subscription for auto-renewal — see CLAUDE.md §9. Razorpay's own
// Subscriptions product schedules and executes recurring charges itself;
// this app just reacts to its webhooks (subscription.charged/.completed/
// .halted/.cancelled — see backend/services/paymentReconcile.service.js and
// backend/controllers/payment.controller.js's handleWebhook). No real
// backend user auth exists for the consumer flow (§8), so identity here is
// customer_phone/email, matching the Payment model's existing convention —
// not a foreign key to `users`.
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
    // Razorpay's own Subscription id — the handle every recurring-billing
    // webhook (subscription.charged/.completed/.halted/.cancelled) and any
    // future cancel-subscription call is keyed on.
    razorpay_subscription_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Mirrors Razorpay's own subscription status: created | authenticated |
    // active | pending | halted | cancelled | completed | expired | failed —
    // kept in sync by paymentReconcile.service.js's webhook handlers.
    mandate_status: {
        type: DataTypes.STRING,
        allowNull: true
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
