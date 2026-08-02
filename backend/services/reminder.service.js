// Business logic for the plan-expiry reminder feature.
//
// This project has no real Subscription/UserSubscription model yet (see
// CLAUDE.md §7/§17 — `user.controller.js` even references a `Subscription`
// model that doesn't exist). Rather than inventing a real one as a side
// effect of this feature, subscriptions live in an in-memory store scoped
// entirely to this file. Swapping this for a real DB-backed model later only
// means changing the functions in this file — jobs/reminder.cron.js,
// queues/reminder.queue.js, and workers/reminder.worker.js never need to
// change.

const subscriptions = new Map(); // id -> subscription record
let nextId = 1;

const MINUTE_MS = 60 * 1000;

// Production-style default: remind this many days before expiry (matches
// the "Your plan will expire in 7 days" example from the spec).
const REMINDER_DAYS_BEFORE = parseInt(process.env.REMINDER_DAYS_BEFORE, 10) || 7;
const DEFAULT_OFFSET_MINUTES = [REMINDER_DAYS_BEFORE * 24 * 60];

/**
 * Registers a subscription to watch for expiry reminders.
 * @param {{ userName: string, planName: string, expiresAt: Date, reminderOffsetsMinutes?: number[] }} input
 *   reminderOffsetsMinutes: how many minutes before expiresAt each reminder
 *   should fire (defaults to REMINDER_DAYS_BEFORE converted to minutes).
 * @returns {string} the new subscription's id
 */
function addSubscription({ userName, planName, expiresAt, reminderOffsetsMinutes }) {
    const id = String(nextId++);
    subscriptions.set(id, {
        id,
        userName,
        planName,
        expiresAt,
        reminderOffsetsMinutes: reminderOffsetsMinutes && reminderOffsetsMinutes.length
            ? reminderOffsetsMinutes
            : DEFAULT_OFFSET_MINUTES,
        sentOffsets: new Set(),
    });
    return id;
}

// Testing-mode helper: seeds one subscription that expires 5 minutes after
// the server starts, with a reminder offset of 0 minutes (i.e. "remind right
// at expiry") so the full cron -> queue -> worker pipeline can be verified
// end-to-end without a real user, a real plan, or the DB.
function createTestSubscription() {
    const expiresAt = new Date(Date.now() + 5 * MINUTE_MS);
    const id = addSubscription({
        userName: 'Test User',
        planName: 'Premium',
        expiresAt,
        reminderOffsetsMinutes: [0],
    });
    console.log(`[reminder.service] test subscription created (id=${id}) — expires at ${expiresAt.toLocaleString()}`);
    return id;
}

// Returns every (subscription, offset) pair whose reminder trigger time has
// passed and hasn't been enqueued yet. Called once per cron tick.
function getDueReminders(now = new Date()) {
    const due = [];
    for (const sub of subscriptions.values()) {
        for (const offsetMinutes of sub.reminderOffsetsMinutes) {
            if (sub.sentOffsets.has(offsetMinutes)) continue;

            const triggerAt = new Date(sub.expiresAt.getTime() - offsetMinutes * MINUTE_MS);
            if (now >= triggerAt) {
                due.push({
                    subscriptionId: sub.id,
                    userName: sub.userName,
                    planName: sub.planName,
                    expiresAt: sub.expiresAt.toISOString(),
                    offsetMinutes,
                });
            }
        }
    }
    return due;
}

// Marks a reminder as enqueued so the next cron tick doesn't push a
// duplicate job for the same subscription/offset. Called only after a
// successful publish — if RabbitMQ was unreachable, the reminder stays
// "due" and gets retried on the next tick instead of being silently lost.
function markReminderEnqueued(subscriptionId, offsetMinutes) {
    const sub = subscriptions.get(subscriptionId);
    if (sub) sub.sentOffsets.add(offsetMinutes);
}

function formatTimestamp(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// The single place a reminder is actually "delivered". Today this only logs
// to the console — swapping in email/SMS/push/in-app/WhatsApp later means
// changing only this function's body; jobs/reminder.cron.js and
// workers/reminder.worker.js never need to know how delivery happens.
function deliverReminder(job) {
    const expiresAt = new Date(job.expiresAt);
    const now = new Date();
    const minutesRemaining = Math.round((expiresAt.getTime() - now.getTime()) / MINUTE_MS);

    const expiryText = minutesRemaining > 0
        ? `${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}`
        : 'now';

    console.log('===================================');
    console.log('Reminder Sent');
    console.log(`User: ${job.userName}`);
    console.log(`Plan: ${job.planName}`);
    console.log(`Expires In: ${expiryText}`);
    console.log(`Time: ${now.toLocaleTimeString()}`);
    console.log('===================================');

    // Extra, more visible line for the "expiring right now" case — this is
    // exactly what the 5-minute test subscription (offset 0) triggers.
    if (minutesRemaining <= 0) {
        console.log('🔔 TEST REMINDER');
        console.log('');
        console.log(`Your ${job.planName} plan will expire now.`);
        console.log('');
        console.log('Timestamp:');
        console.log(formatTimestamp(now));
        console.log('');
    }
}

module.exports = {
    addSubscription,
    createTestSubscription,
    getDueReminders,
    markReminderEnqueued,
    deliverReminder,
};
