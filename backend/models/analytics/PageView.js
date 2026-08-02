const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.config');

// One row per page seen. `time_on_page_seconds` starts null and is filled in
// best-effort once the next pageview/session_end hit arrives for the same
// session (see services/analytics/eventBuffer.service.js) — the last page of
// a session that never sends another hit (tab closed, no pagehide beacon)
// simply keeps it null rather than a guessed value. High-volume,
// server-generated PK (BIGINT autoincrement) — not client-generated, since
// nothing ever needs to reference a page view before it's written.
const PageView = sequelize.define('PageView', {
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
    url: {
        type: DataTypes.STRING(512),
        allowNull: false
    },
    page_title: {
        type: DataTypes.STRING(512),
        allowNull: true
    },
    entered_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    time_on_page_seconds: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true
    },
    is_entry_page: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'analytics_page_views',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = PageView;
