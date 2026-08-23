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
    // Set only on recurring Razorpay Subscription charges (payment_method
    // 'RAZORPAY_AUTOPAY', created from the `subscription.charged` webhook —
    // see paymentReconcile.service.js) — links back to the Subscription
    // being billed. The original one-time/registration payment leaves this
    // null; it's instead pointed to via subscriptions.last_payment_id. See
    // migration 20260808140000-add-subscription-id-to-payments.js.
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
    // 'RAZORPAY' (one-time order) | 'RAZORPAY_AUTOPAY' (recurring Subscription
    // charge, see the subscription_id comment below) — Razorpay's own
    // payment.method (card/upi/netbanking/...) is captured separately, in
    // razorpay_method below, once the charge actually completes.
    payment_method: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'RAZORPAY'
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending' // pending | success | failed | cancelled
    },
    razorpay_order_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    razorpay_payment_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    razorpay_signature: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Razorpay's own payment.method (card/upi/netbanking/wallet/emandate...).
    razorpay_method: {
        type: DataTypes.STRING,
        allowNull: true
    },
    razorpay_bank_ref: {
        type: DataTypes.STRING,
        allowNull: true
    },
    razorpay_response: {
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
    // checkout time (POST /api/payments/create) since applyPaymentResult()
    // (paymentReconcile.service.js) has no request context when a payment
    // later becomes 'success' (see migration
    // 20260808120000-add-meta-capi-columns-to-payments.js).
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
