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
        // Fixed name so sync({ alter: true }) matches the existing DB index
        // by name on every boot instead of adding a new duplicate one each
        // time — see backend/models/User.js for the full explanation.
        unique: 'payments_txnid_unique'
    },
    plan_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    // Set only on recurring UPI Autopay charge attempts (payment_method
    // 'UPI_AUTOPAY') — links back to the Subscription being billed. The
    // original one-time/registration payment leaves this null; it's instead
    // pointed to via subscriptions.last_payment_id. See
    // backend/services/autopayBilling.service.js and migration
    // 20260808140000-add-subscription-id-to-payments.js.
    subscription_id: {
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
    },
    // Meta Conversions API (CAPI) support — captured from the browser at
    // checkout time (POST /api/payments/create) since reconcileWithPayu()
    // has no request context when a payment later becomes 'success' (see
    // migration 20260808120000-add-meta-capi-columns-to-payments.js).
    fbc: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fbp: {
        type: DataTypes.STRING,
        allowNull: true
    },
    client_ip: {
        type: DataTypes.STRING,
        allowNull: true
    },
    client_user_agent: {
        type: DataTypes.STRING(512),
        allowNull: true
    },
    meta_event_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    capi_sent_at: {
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
