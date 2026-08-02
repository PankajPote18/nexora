// Computes one AnalyticsSummary row (see models/analytics/AnalyticsSummary.js)
// for a given calendar day from the raw analytics tables. Run nightly by
// jobs/analyticsRollup.cron.js for "yesterday" — today's data is always
// served live by controllers/analytics/dashboard.controller.js instead,
// since it's still accumulating.

const { Op, fn, col } = require('sequelize');
const { Visitor, Session, PageView, AnalyticsSummary } = require('../../models');

// dateStr: 'YYYY-MM-DD'
async function computeDailySummary(dateStr) {
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const range = { [Op.gte]: dayStart, [Op.lt]: dayEnd };

    // Deliberately sequential (one connection borrowed at a time), not
    // Promise.all — this function can be invoked once per missing calendar
    // day when backfilling a date range with no rollup rows yet (see
    // dashboard.controller.js's getTrend), and each concurrent in-flight
    // date already costs a connection on top of that. Parallelizing these 7
    // queries would multiply that to 7 connections per date, which combined
    // with running several dates at once could exhaust a worker's whole
    // pool share (this project's own DB_POOL_MAX split across cluster
    // workers, see db.config.js) and start starving ordinary site traffic —
    // worse than the extra latency this avoids.
    const totalSessions = await Session.count({ where: { started_at: range } });
    const totalPageViews = await PageView.count({ where: { entered_at: range } });
    const totalVisitors = await Session.count({ where: { started_at: range }, distinct: true, col: 'visitor_id' });
    const newVisitors = await Visitor.count({ where: { first_visit_at: range } });
    const returningVisitors = Math.max(0, totalVisitors - newVisitors);
    const conversions = await Session.count({ where: { started_at: range, converted: true } });
    const bounces = await Session.count({ where: { started_at: range, is_bounce: true } });
    const bounceRate = totalSessions > 0 ? Number(((bounces / totalSessions) * 100).toFixed(2)) : 0;

    const durationResult = await Session.findOne({
        attributes: [[fn('AVG', col('duration_seconds')), 'avgDuration']],
        where: { started_at: range },
        raw: true
    });
    const avgSessionDurationSeconds = Math.round(Number(durationResult?.avgDuration) || 0);

    const [summary] = await AnalyticsSummary.upsert({
        date: dateStr,
        total_visitors: totalVisitors,
        new_visitors: newVisitors,
        returning_visitors: returningVisitors,
        total_sessions: totalSessions,
        total_page_views: totalPageViews,
        avg_session_duration_seconds: avgSessionDurationSeconds,
        bounce_rate: bounceRate,
        conversions
    });

    return summary;
}

function toDateStr(date) {
    return date.toISOString().slice(0, 10);
}

async function computeYesterday() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return computeDailySummary(toDateStr(yesterday));
}

module.exports = { computeDailySummary, computeYesterday, toDateStr };
