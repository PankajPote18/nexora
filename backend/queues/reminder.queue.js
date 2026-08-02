// Queue-specific wiring for the reminder feature: queue/dead-letter names,
// publishing a reminder job, and consuming reminder jobs. Talks to RabbitMQ
// only through queues/rabbitmq.js's shared connection — never opens its own.

const rabbitmq = require('./rabbitmq');

const QUEUE_NAME = process.env.REMINDER_QUEUE_NAME || 'reminder_queue';
const DEAD_LETTER_QUEUE_NAME = `${QUEUE_NAME}_failed`;

async function assertQueues(channel) {
    // Both durable: survive a RabbitMQ restart, matching `persistent: true`
    // on the messages themselves below.
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.assertQueue(DEAD_LETTER_QUEUE_NAME, { durable: true });
}

// Pushes one reminder job onto the queue. Returns false (never throws) if
// RabbitMQ is unreachable — the cron job treats that as "not yet enqueued"
// and will naturally retry the same reminder on its next tick.
async function publishReminderJob(job) {
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

// Starts consuming reminder jobs, invoking `handler(job)` for each one.
// - Success: message is acknowledged and removed from the queue.
// - Failure, retries remaining: acknowledged (so it doesn't block the queue)
//   and republished with an incremented retry count after a short backoff.
// - Failure, retries exhausted: routed to the dead-letter queue for manual
//   inspection instead of being retried forever.
async function consumeReminderJobs(handler, { maxRetries = 3, retryDelayMs = 3000 } = {}) {
    const channel = await rabbitmq.connect();
    if (!channel) {
        console.error('[reminder.queue] RabbitMQ unavailable — worker will start consuming once a connection is established');
        return;
    }

    await assertQueues(channel);

    channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;

        let job;
        try {
            job = JSON.parse(msg.content.toString());
        } catch (err) {
            console.error('[reminder.worker] discarding malformed job payload:', err.message);
            channel.ack(msg);
            return;
        }

        try {
            await handler(job);
            channel.ack(msg);
        } catch (err) {
            channel.ack(msg); // remove from the main queue; retry is handled explicitly below
            const retryCount = (job._retryCount || 0) + 1;
            console.error(`[reminder.worker] job failed for subscription ${job.subscriptionId} (attempt ${retryCount}/${maxRetries}):`, err.message);

            if (retryCount <= maxRetries) {
                setTimeout(() => {
                    publishReminderJob({ ...job, _retryCount: retryCount }).catch((republishErr) => {
                        console.error('[reminder.worker] failed to republish retry:', republishErr.message);
                    });
                }, retryDelayMs * retryCount); // linear backoff
            } else {
                console.error(`[reminder.worker] subscription ${job.subscriptionId} exceeded max retries — sending to dead-letter queue "${DEAD_LETTER_QUEUE_NAME}"`);
                publishToDeadLetter(job).catch((dlqErr) => {
                    console.error('[reminder.worker] failed to publish to dead-letter queue:', dlqErr.message);
                });
            }
        }
    }, { noAck: false });

    console.log(`[reminder.queue] worker consuming from "${QUEUE_NAME}"`);
}

module.exports = {
    QUEUE_NAME,
    DEAD_LETTER_QUEUE_NAME,
    publishReminderJob,
    consumeReminderJobs,
};
