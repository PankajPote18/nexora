const { Payment, Subscription, SubscriptionPlan } = require('../models');
const { sequelize } = require('../config/db.config');
const { verifyPaymentWithPayu, mapPayuStatus } = require('../utils/payu.util');
const metaCapiUtil = require('../utils/metaCapi.util');

const FINAL_STATUSES = ['success', 'failed', 'cancelled'];
const VERIFY_THROTTLE_MS = 5000;

// After this many consecutive recurring-charge failures on a Subscription,
// autopay is auto-disabled rather than retried forever — matches the
// REMINDER_MAX_RETRIES=3 precedent already used elsewhere in this codebase.
const AUTOPAY_MAX_CONSECUTIVE_FAILURES = parseInt(process.env.AUTOPAY_MAX_CONSECUTIVE_FAILURES, 10) || 3;

// Looks up the authoritative status from PayU and applies it idempotently
// under a row lock, so concurrent callback/webhook/poll/autopay-worker
// requests can't double-process the same transaction. Shared by the one-time
// checkout flow (payment.controller.js) and the recurring autopay billing
// worker (services/autopayBilling.service.js) — extracted here so both reuse
// the exact same row-locking transaction instead of duplicating it.
async function reconcileWithPayu(txnid) {
    const t = await sequelize.transaction();
    try {
        const payment = await Payment.findOne({ where: { txnid }, transaction: t, lock: true });
        if (!payment) {
            console.warn(`PayU callback/verify for unknown txnid=${txnid}`);
            await t.commit();
            return;
        }

        if (FINAL_STATUSES.includes(payment.status)) {
            // Already finalized — idempotent no-op for duplicate deliveries.
            await t.commit();
            return;
        }

        let details;
        try {
            details = await verifyPaymentWithPayu(txnid);
        } catch (err) {
            console.error(`PayU verify_payment call failed for txnid=${txnid}:`, err.message);
            await payment.update({ last_verified_at: new Date() }, { transaction: t });
            await t.commit();
            return;
        }

        if (!details) {
            // PayU has no record yet (or the call failed) — leave pending, try again later.
            await payment.update({ last_verified_at: new Date() }, { transaction: t });
            await t.commit();
            return;
        }

        const newStatus = mapPayuStatus(details.status, details.unmappedstatus);

        await payment.update({
            status: newStatus,
            payu_mihpayid: details.mihpayid || payment.payu_mihpayid,
            payu_bank_ref_num: details.bank_ref_num || null,
            payu_mode: details.mode || null,
            payu_response: JSON.stringify(details),
            error_message: newStatus === 'failed' || newStatus === 'cancelled' ? (details.error_Message || details.field9 || null) : null,
            last_verified_at: new Date()
        }, { transaction: t });

        // Mandate registration confirmation — only matches a payment that a
        // Subscription is still waiting on (subscriptions.last_payment_id,
        // mandate_status:'pending', set by payment.controller.js's
        // createPayment when enable_autopay was requested). A recurring
        // charge payment never matches this (it isn't a Subscription's
        // last_payment_id until *after* it succeeds, below).
        const pendingMandateSub = await Subscription.findOne({
            where: { last_payment_id: payment.id, mandate_status: 'pending' },
            transaction: t,
            lock: true
        });
        if (pendingMandateSub) {
            if (newStatus === 'success') {
                await pendingMandateSub.update({
                    mandate_status: 'active',
                    payu_mandate_ref: details.mihpayid || payment.payu_mihpayid
                }, { transaction: t });
            } else if (newStatus === 'failed' || newStatus === 'cancelled') {
                await pendingMandateSub.update({ mandate_status: 'failed', autopay_enabled: false }, { transaction: t });
            }
        }

        // Recurring-charge billing-cycle advance — only matches a payment
        // created by the autopay billing worker (subscription_id set).
        if (payment.subscription_id) {
            const subscription = await Subscription.findByPk(payment.subscription_id, { transaction: t, lock: true });
            if (subscription) {
                if (newStatus === 'success') {
                    const plan = await SubscriptionPlan.findByPk(subscription.plan_id, { transaction: t });
                    const extendDays = plan ? plan.number_of_days : 30;
                    // Extend from the subscription's *old* expiry (not now),
                    // so a slightly-late cron tick never shrinks the paid period.
                    const base = subscription.expires_at && subscription.expires_at.getTime() > Date.now()
                        ? subscription.expires_at
                        : new Date();
                    await subscription.update({
                        expires_at: new Date(base.getTime() + extendDays * 86400000),
                        last_billed_at: new Date(),
                        last_payment_id: payment.id,
                        failed_attempt_count: 0
                    }, { transaction: t });
                } else if (newStatus === 'failed' || newStatus === 'cancelled') {
                    const nextCount = (subscription.failed_attempt_count || 0) + 1;
                    const updates = { failed_attempt_count: nextCount };
                    if (nextCount >= AUTOPAY_MAX_CONSECUTIVE_FAILURES) {
                        updates.autopay_enabled = false;
                        updates.mandate_status = 'cancelled';
                    }
                    await subscription.update(updates, { transaction: t });
                }
            }
        }

        await t.commit();
        console.log(`Payment txnid=${txnid} reconciled with PayU -> status=${newStatus}`);

        // Meta CompleteRegistration CAPI mirror only makes sense for the
        // one-time/registration payment, not a recurring autopay charge (that
        // would re-fire "registration" every billing cycle, which is wrong).
        if (newStatus === 'success' && !payment.capi_sent_at && payment.payment_method !== 'UPI_AUTOPAY') {
            // Not awaited — must not affect response timing for whichever
            // caller (webhook/poll/callback/autopay worker) triggered this.
            sendMetaCapiCompleteRegistration(payment).catch((err) => {
                console.error(`Meta CAPI send failed for txnid=${txnid}:`, err);
            });
        }
    } catch (err) {
        await t.rollback();
        console.error(`Error reconciling payment txnid=${txnid} with PayU:`, err);
    }
}

// Fires the server-side Meta CAPI mirror of the CompleteRegistration event
// the frontend already sends client-side (src/analytics/metaEvents.js), once
// per payment — capi_sent_at marks the attempt (not success) so a webhook
// retry on an already-success payment never sends a duplicate.
async function sendMetaCapiCompleteRegistration(payment) {
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    await metaCapiUtil.sendCompleteRegistrationEvent({
        eventId: payment.meta_event_id,
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl: `${frontendUrl}/plans`,
        phone: payment.customer_phone,
        valueAmount: payment.amount,
        currency: 'INR',
        clientIp: payment.client_ip,
        userAgent: payment.client_user_agent,
        fbc: payment.fbc,
        fbp: payment.fbp
    });
    await payment.update({ capi_sent_at: new Date() });
}

module.exports = { FINAL_STATUSES, VERIFY_THROTTLE_MS, reconcileWithPayu };
