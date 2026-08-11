// Business logic for the recurring UPI Autopay billing feature — the DB is
// the source of truth here (unlike services/reminder.service.js's in-memory
// Map), since this drives real payment attempts and must survive restarts.
// See CLAUDE.md §9/§22, backend/models/Subscription.js, and
// jobs|queues|workers/autopayBilling.*.

const { Op } = require('sequelize');
const { Subscription, SubscriptionPlan, Payment } = require('../models');
const payuUtil = require('../utils/payu.util');
const { reconcileWithPayu } = require('./payuReconcile.service');

const GRACE_MINUTES = parseInt(process.env.AUTOPAY_BILLING_GRACE_MINUTES, 10) || 0;

// How long a pending UPI_AUTOPAY Payment blocks the same subscription from
// being picked up again — must comfortably cover the pre-debit-notification
// + si_transaction + PayU-verify round trip (well under a minute normally,
// but RabbitMQ backlog or gateway latency can stretch that). Without this,
// a subscription still "due" on the next cron tick (this runs every minute
// by default) gets a second independent charge job enqueued against the
// same live UPI mandate — a real duplicate-debit risk, not just a duplicate
// row. If a charge attempt genuinely dies without ever reconciling, the
// subscription becomes billable again after this window instead of being
// permanently stuck.
const IN_FLIGHT_COOLDOWN_MINUTES = parseInt(process.env.AUTOPAY_IN_FLIGHT_COOLDOWN_MINUTES, 10) || 15;

// Subscriptions whose mandate is active and whose current billing period has
// ended (or is about to, within the configured grace window) — excluding any
// subscription that already has a recent pending charge attempt in flight.
async function getDueSubscriptions(now = new Date()) {
    const cutoff = new Date(now.getTime() + GRACE_MINUTES * 60000);
    const inFlightCutoff = new Date(now.getTime() - IN_FLIGHT_COOLDOWN_MINUTES * 60000);

    const inFlightPayments = await Payment.findAll({
        where: {
            payment_method: 'UPI_AUTOPAY',
            status: 'pending',
            createdAt: { [Op.gte]: inFlightCutoff }
        },
        attributes: ['subscription_id']
    });
    const inFlightSubscriptionIds = inFlightPayments
        .map((p) => p.subscription_id)
        .filter(Boolean);

    return Subscription.findAll({
        where: {
            autopay_enabled: true,
            mandate_status: 'active',
            status: 'active',
            expires_at: { [Op.lte]: cutoff },
            ...(inFlightSubscriptionIds.length ? { id: { [Op.notIn]: inFlightSubscriptionIds } } : {})
        }
    });
}

// Creates a fresh pending Payment row for this billing attempt BEFORE the
// job is even enqueued (see jobs/autopayBilling.cron.js) — real money is
// involved, so a crashed worker or an unreachable broker must leave a
// visible `pending` audit trail rather than silently losing the attempt,
// same "create the record first" pattern payment.controller.js's
// createPayment already uses for the one-time flow.
async function createChargeAttempt(subscription) {
    const plan = await SubscriptionPlan.findByPk(subscription.plan_id);
    const amount = plan ? Number(plan.original_price).toFixed(2) : '0.00';
    const txnid = payuUtil.generateTxnId();

    const payment = await Payment.create({
        txnid,
        plan_id: subscription.plan_id,
        subscription_id: subscription.id,
        customer_name: 'ClickBuz User',
        customer_email: subscription.customer_email || `user${subscription.customer_phone}@clickbuz-demo.local`,
        customer_phone: subscription.customer_phone,
        amount,
        payment_method: 'UPI_AUTOPAY',
        status: 'pending'
    });

    return { payment, txnid, amount };
}

// Called by the worker (workers/autopayBilling.worker.js) for each queued
// job. Triggers the recurring debit against PayU, then re-verifies via the
// same shared reconcile path the one-time checkout flow uses — never trusts
// si_transaction's own immediate response as final (same rule
// payment.controller.js's processCallback already documents).
async function processChargeJob(job) {
    const key = process.env.PAYU_MERCHANT_KEY;
    const salt = process.env.PAYU_SALT;
    if (!key || !salt) {
        throw new Error('PayU credentials are not configured (PAYU_MERCHANT_KEY / PAYU_SALT missing)');
    }

    // PayU/NPCI requires a pre-debit notification before every recurring
    // charge (see payuUtil.triggerPreDebitNotification's comment) — without
    // it si_transaction rejects with error_code E1702. Not awaited-for-
    // failure-tolerance: if this itself throws, let it propagate so the
    // queue's retry/DLQ machinery handles it like any other processing error.
    console.log(`[autopay.service] sending pre-debit notification for subscription ${job.subscriptionId}, txnid=${job.txnid}`);
    await payuUtil.triggerPreDebitNotification({
        key,
        authpayuid: job.authpayuid,
        amount: job.amount,
        debitDate: new Date().toISOString().slice(0, 10),
        salt
    });

    console.log(`[autopay.service] triggering recurring charge for subscription ${job.subscriptionId}, txnid=${job.txnid}, amount=${job.amount}`);

    await payuUtil.triggerRecurringCharge({
        key,
        authpayuid: job.authpayuid,
        amount: job.amount,
        txnid: job.txnid,
        phone: job.customerPhone,
        email: job.customerEmail,
        salt
    });

    // triggerRecurringCharge's own response isn't authoritative — reconcile
    // against PayU's Verify Payment API, same as every other flow in this
    // app. This also applies the Subscription expires_at/last_billed_at
    // advance (or failed_attempt_count increment) — see
    // payuReconcile.service.js's subscription_id branch.
    await reconcileWithPayu(job.txnid);
}

module.exports = { getDueSubscriptions, createChargeAttempt, processChargeJob };
