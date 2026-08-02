// Nightly rollup for the analytics dashboard's long-range trend charts (see
// services/analytics/rollup.service.js). Runs once in the cluster primary
// only (server.js), same reasoning as jobs/reminder.cron.js — running this
// per-worker would recompute (harmlessly, since it's an idempotent upsert,
// but wastefully) the same row N times.

const cron = require('node-cron');
const { computeYesterday } = require('../services/analytics/rollup.service');

const CRON_SCHEDULE = process.env.ANALYTICS_ROLLUP_CRON_SCHEDULE || '10 0 * * *'; // 00:10 daily

let task = null;

function startAnalyticsRollupCron() {
    if (task) return task;

    task = cron.schedule(CRON_SCHEDULE, async () => {
        try {
            const summary = await computeYesterday();
            console.log(`[analytics.rollup] computed daily summary for ${summary.date}`);
        } catch (err) {
            console.error('[analytics.rollup] failed to compute daily summary:', err.message);
        }
    });

    console.log(`[analytics.rollup] cron started with schedule "${CRON_SCHEDULE}"`);
    return task;
}

function stopAnalyticsRollupCron() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { startAnalyticsRollupCron, stopAnalyticsRollupCron };
