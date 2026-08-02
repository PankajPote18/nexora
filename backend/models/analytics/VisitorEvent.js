const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.config');

// Reusable custom-event log: contact_form_submitted, cta_clicked,
// whatsapp_click, email_click, phone_click, download_click,
// newsletter_signup, quote_request, or any future event name a page/component
// passes to trackEvent() (see src/analytics/tracker.js) — event_name is a
// free-text string, not an enum, specifically so new events never need a
// schema change. `metadata` mirrors Movie.cast's existing pattern in this
// codebase (JSON-stringified TEXT, parsed manually by callers).
const VisitorEvent = sequelize.define('VisitorEvent', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    session_id: {
        type: DataTypes.STRING(36),
        allowNull: false
    },
    visitor_id: {
        type: DataTypes.STRING(36),
        allowNull: false
    },
    event_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    event_category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    page_url: {
        type: DataTypes.STRING(512),
        allowNull: true
    },
    metadata: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_conversion: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'analytics_visitor_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = VisitorEvent;
