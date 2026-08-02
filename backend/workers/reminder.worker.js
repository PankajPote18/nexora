// Worker/consumer for the reminder feature. Subscribes to the RabbitMQ
// reminder queue and, for each job, hands it to reminder.service.js's
// deliverReminder() — the only place that decides how a reminder is
// actually surfaced (console.log today, a real notification channel later).

const { consumeReminderJobs } = require('../queues/reminder.queue');
const reminderService = require('../services/reminder.service');

const MAX_RETRIES = parseInt(process.env.REMINDER_MAX_RETRIES, 10) || 3;
const RETRY_DELAY_MS = parseInt(process.env.REMINDER_RETRY_DELAY_MS, 10) || 3000;

async function startReminderWorker() {
    await consumeReminderJobs(
        async (job) => {
            reminderService.deliverReminder(job);
        },
        { maxRetries: MAX_RETRIES, retryDelayMs: RETRY_DELAY_MS }
    );
}

module.exports = { startReminderWorker };
