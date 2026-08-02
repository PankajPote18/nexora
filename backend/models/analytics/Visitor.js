const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.config');

// One row per unique browser/device (client-generated UUID, see
// src/analytics/tracker.js) — never per pageview. `first_*` columns are
// immutable first-touch attribution (CLAUDE.md-style requirement: "first
// attribution should persist throughout the visitor session and optionally
// across future visits"); `last_visit_at`/`total_visits`/`total_sessions`
// are the only columns updated on a returning visit. Raw IP is never
// stored — only a salted hash (see utils/analytics/ipHash.util.js).
const Visitor = sequelize.define('Visitor', {
    visitor_id: {
        type: DataTypes.STRING(36),
        primaryKey: true
    },
    ip_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    first_visit_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    last_visit_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    total_visits: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
    },
    total_sessions: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
    },
    is_returning: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    country: { type: DataTypes.STRING, allowNull: true },
    region: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    timezone: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    isp: { type: DataTypes.STRING, allowNull: true },
    device_type: { type: DataTypes.STRING, allowNull: true }, // desktop | mobile | tablet
    device_model: { type: DataTypes.STRING, allowNull: true },
    browser: { type: DataTypes.STRING, allowNull: true },
    browser_version: { type: DataTypes.STRING, allowNull: true },
    os: { type: DataTypes.STRING, allowNull: true },
    os_version: { type: DataTypes.STRING, allowNull: true },
    screen_resolution: { type: DataTypes.STRING, allowNull: true },
    language: { type: DataTypes.STRING, allowNull: true },
    first_referrer_url: { type: DataTypes.TEXT, allowNull: true },
    first_referrer_domain: { type: DataTypes.STRING, allowNull: true },
    first_landing_page: { type: DataTypes.STRING(512), allowNull: true },
    first_traffic_source: { type: DataTypes.STRING, allowNull: true },
    first_utm_source: { type: DataTypes.STRING, allowNull: true },
    first_utm_medium: { type: DataTypes.STRING, allowNull: true },
    first_utm_campaign: { type: DataTypes.STRING, allowNull: true },
    first_utm_term: { type: DataTypes.STRING, allowNull: true },
    first_utm_content: { type: DataTypes.STRING, allowNull: true }
}, {
    tableName: 'analytics_visitors',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Visitor;
