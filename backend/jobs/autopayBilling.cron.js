// Cron entry point for the autopay billing feature. Runs on a schedule, asks
// autopayBilling.service.js which subscriptions are due for a recurring
// charge, creates the pending Payment audit-trail row for each one, and
// pushes a charge job onto RabbitMQ — it never calls PayU itself (that's
// workers/autopayBilling.worker.js's job, deliberately decoupled via the
// queue, mirroring jobs/reminder.cron.js's structure).

const cron = require('node-cron');
const autopayBillingService = require('../services/autopayBilling.service');
const { publishChargeJob } = require('../queues/autopayBilling.queue');

const CRON_SCHEDULE = process.env.AUTOPAY_BILLING_CRON_SCHEDULE || '* * * * *';

let task = null;

function startAutopayBillingCron() {
    if (task) return task; // idempotent — starting twice is a no-op

    task = cron.schedule(CRON_SCHEDULE, async () => {
        let due;
        try {
            due = await autopayBillingService.getDueSubscriptions();
        } catch (err) {
            console.error('[autopay.cron] failed to look up due subscriptions:', err.message);
            return;
        }

        for (const subscription of due) {
            try {
                // Create the pending Payment row first (see
                // autopayBilling.service.js's createChargeAttempt) — even if
                // RabbitMQ is unreachable below, this leaves a visible audit
                // trail rather than silently losing the attempt. Since
                // expires_at hasn't moved, this subscription is picked up
                // again on the next tick if the publish fails.
                const { payment, txnid, amount } = await autopayBillingService.createChargeAttempt(subscription);

                const job = {
                    subscriptionId: subscription.id,
                    paymentId: payment.id,
                    txnid,
                    amount,
                    planId: subscription.plan_id,
                    authpayuid: subscription.payu_mandate_ref,
                    customerPhone: subscription.customer_phone,
                    customerEmail: subscription.customer_email
                };

                const enqueued = await publishChargeJob(job);
                if (enqueued) {
                    console.log(`[autopay.cron] enqueued charge for subscription ${subscription.id} (txnid=${txnid})`);
                } else {
                    console.warn(`[autopay.cron] RabbitMQ unavailable — charge attempt txnid=${txnid} left pending, will retry subscription ${subscription.id} next tick`);
                }
            } catch (err) {
                console.error(`[autopay.cron] failed to enqueue charge for subscription ${subscription.id}:`, err.message);
            }
        }
    });

    console.log(`[autopay.cron] started with schedule "${CRON_SCHEDULE}"`);
    return task;
}

function stopAutopayBillingCron() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { startAutopayBillingCron, stopAutopayBillingCron };
