const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.config');

// One row per calendar day — a precomputed rollup (see
// jobs/analyticsRollup.cron.js) so the dashboard's long-range trend charts
// never need to aggregate the full analytics_sessions/analytics_page_views
// tables at read time once history grows into the millions of rows. Today's
// row doesn't exist yet until the nightly cron runs past midnight — the
// dashboard controller fills that gap with a live query for "today" only.
const AnalyticsSummary = sequelize.define('AnalyticsSummary', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        // Fixed name (not bare `unique: true`) — see backend/models/User.js's
        // comment / CLAUDE.md §17 for why every unique column in this project
        // must be named explicitly under sync({ alter: true }).
        unique: 'analytics_daily_summary_date_unique'
    },
    total_visitors: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    new_visitors: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    returning_visitors: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    total_sessions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    total_page_views: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    avg_session_duration_seconds: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    bounce_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    conversions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
}, {
    tableName: 'analytics_daily_summary',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = AnalyticsSummary;
