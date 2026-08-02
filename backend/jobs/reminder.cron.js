// Cron entry point for the reminder feature. Runs on a schedule, asks
// reminder.service.js which subscriptions are due for a reminder, and pushes
// each one onto RabbitMQ — it never sends a reminder itself (that's
// workers/reminder.worker.js's job, deliberately decoupled via the queue).

const cron = require('node-cron');
const reminderService = require('../services/reminder.service');
const { publishReminderJob } = require('../queues/reminder.queue');

// Every minute, per the spec (production would likely use something coarser,
// e.g. hourly — this is intentionally tight for fast local testing).
const CRON_SCHEDULE = process.env.REMINDER_CRON_SCHEDULE || '* * * * *';

let task = null;

function startReminderCron() {
    if (task) return task; // idempotent — starting twice is a no-op

    task = cron.schedule(CRON_SCHEDULE, async () => {
        let due;
        try {
            due = reminderService.getDueReminders();
        } catch (err) {
            console.error('[reminder.cron] failed to look up due reminders:', err.message);
            return;
        }

        for (const reminder of due) {
            try {
                const enqueued = await publishReminderJob(reminder);
                if (enqueued) {
                    reminderService.markReminderEnqueued(reminder.subscriptionId, reminder.offsetMinutes);
                    console.log(`[reminder.cron] enqueued reminder for subscription ${reminder.subscriptionId} (offset ${reminder.offsetMinutes}min)`);
                } else {
                    console.warn(`[reminder.cron] RabbitMQ unavailable — will retry subscription ${reminder.subscriptionId} next tick`);
                }
            } catch (err) {
                console.error(`[reminder.cron] failed to enqueue reminder for subscription ${reminder.subscriptionId}:`, err.message);
            }
        }
    });

    console.log(`[reminder.cron] started with schedule "${CRON_SCHEDULE}"`);
    return task;
}

function stopReminderCron() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { startReminderCron, stopReminderCron };
