// Queue-specific wiring for the autopay billing feature: queue/dead-letter
// names, publishing a charge job, and consuming charge jobs. Mirrors
// queues/reminder.queue.js exactly, talking to RabbitMQ only through the
// shared queues/rabbitmq.js connection — never opens its own.

const rabbitmq = require('./rabbitmq');

const QUEUE_NAME = process.env.AUTOPAY_BILLING_QUEUE_NAME || 'autopay_billing_queue';
const DEAD_LETTER_QUEUE_NAME = `${QUEUE_NAME}_failed`;

async function assertQueues(channel) {
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.assertQueue(DEAD_LETTER_QUEUE_NAME, { durable: true });
}

// Pushes one charge job onto the queue. Returns false (never throws) if
// RabbitMQ is unreachable — the cron treats that as "not yet enqueued" and
// will pick the same subscription up again next tick (its expires_at hasn't
// moved, and the pending Payment row created before this call is the audit
// trail of the attempt).
async function publishChargeJob(job) {
    const channel = await rabbitmq.connect();
    if (!channel) return false;

    await assertQueues(channel);
    const payload = Buffer.from(JSON.stringify(job));
    return channel.sendToQueue(QUEUE_NAME, payload, { persistent: true });
}

async function publishToDeadLetter(job) {
    const channel = await rabbitmq.connect();
    if (!channel) return false;

    await assertQueues(channel);
    const payload = Buffer.from(JSON.stringify(job));
    return channel.sendToQueue(DEAD_LETTER_QUEUE_NAME, payload, { persistent: true });
}

// Starts consuming charge jobs, invoking `handler(job)` for each one.
// - Success: message is acknowledged and removed from the queue.
// - Failure (a thrown exception — a transient processing error, e.g. a
//   network error talking to PayU), retries remaining: acknowledged (so it
//   doesn't block the queue) and republished with an incremented retry count
//   after a linear backoff.
// - Failure, retries exhausted: routed to the dead-letter queue.
// Note: a PayU *decline* (the charge completed but failed) is NOT an
// exception here — processChargeJob resolves normally in that case, and
// Subscription.failed_attempt_count (see autopayBilling.service.js) is the
// separate, business-logic-level retry concept for that.
async function consumeChargeJobs(handler, { maxRetries = 3, retryDelayMs = 3000 } = {}) {
    const channel = await rabbitmq.connect();
    if (!channel) {
        console.error('[autopay.queue] RabbitMQ unavailable — worker will start consuming once a connection is established');
        return;
    }

    await assertQueues(channel);

    channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;

        let job;
        try {
            job = JSON.parse(msg.content.toString());
        } catch (err) {
            console.error('[autopay.worker] discarding malformed job payload:', err.message);
            channel.ack(msg);
            return;
        }

        try {
            await handler(job);
            channel.ack(msg);
        } catch (err) {
            channel.ack(msg); // remove from the main queue; retry is handled explicitly below
            const retryCount = (job._retryCount || 0) + 1;
            console.error(`[autopay.worker] job failed for subscription ${job.subscriptionId} (attempt ${retryCount}/${maxRetries}):`, err.message);

            if (retryCount <= maxRetries) {
                setTimeout(() => {
                    publishChargeJob({ ...job, _retryCount: retryCount }).catch((republishErr) => {
                        console.error('[autopay.worker] failed to republish retry:', republishErr.message);
                    });
                }, retryDelayMs * retryCount); // linear backoff
            } else {
                console.error(`[autopay.worker] subscription ${job.subscriptionId} exceeded max retries — sending to dead-letter queue "${DEAD_LETTER_QUEUE_NAME}"`);
                publishToDeadLetter(job).catch((dlqErr) => {
                    console.error('[autopay.worker] failed to publish to dead-letter queue:', dlqErr.message);
                });
            }
        }
    }, { noAck: false });

    console.log(`[autopay.queue] worker consuming from "${QUEUE_NAME}"`);
}

module.exports = {
    QUEUE_NAME,
    DEAD_LETTER_QUEUE_NAME,
    publishChargeJob,
    consumeChargeJobs,
};
