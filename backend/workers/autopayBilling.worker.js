// Worker/consumer for the autopay billing feature. Subscribes to the
// RabbitMQ autopay billing queue and, for each job, hands it to
// autopayBilling.service.js's processChargeJob() — mirrors
// workers/reminder.worker.js's thin-wrapper structure.

const { consumeChargeJobs } = require('../queues/autopayBilling.queue');
const autopayBillingService = require('../services/autopayBilling.service');

const MAX_RETRIES = parseInt(process.env.AUTOPAY_MAX_RETRIES, 10) || 3;
const RETRY_DELAY_MS = parseInt(process.env.AUTOPAY_RETRY_DELAY_MS, 10) || 3000;

async function startAutopayBillingWorker() {
    await consumeChargeJobs(
        async (job) => {
            await autopayBillingService.processChargeJob(job);
        },
        { maxRetries: MAX_RETRIES, retryDelayMs: RETRY_DELAY_MS }
    );
}

module.exports = { startAutopayBillingWorker };
