'use strict';

// Creates the 5 tables for the Website Analytics System (see CLAUDE.md §23
// and backend/models/analytics/*.js — column types here mirror those model
// definitions exactly, so sync({ alter: true }) on the next boot sees no
// drift to "fix"). Purely additive: no existing table is touched. Idempotent
// via a table-existence check, same pattern as this project's other two
// migrations.

const hasIndex = (indexes, name) => indexes.some((idx) => idx.name === name);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const existingTables = await queryInterface.showAllTables();

        if (!existingTables.includes('analytics_visitors')) {
            await queryInterface.createTable('analytics_visitors', {
                visitor_id: { type: Sequelize.STRING(36), primaryKey: true },
                ip_hash: { type: Sequelize.STRING(64), allowNull: true },
                first_visit_at: { type: Sequelize.DATE, allowNull: false },
                last_visit_at: { type: Sequelize.DATE, allowNull: false },
                total_visits: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
                total_sessions: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
                is_returning: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
                country: { type: Sequelize.STRING, allowNull: true },
                region: { type: Sequelize.STRING, allowNull: true },
                city: { type: Sequelize.STRING, allowNull: true },
                timezone: { type: Sequelize.STRING, allowNull: true },
                latitude: { type: Sequelize.DECIMAL(9, 6), allowNull: true },
                longitude: { type: Sequelize.DECIMAL(9, 6), allowNull: true },
                isp: { type: Sequelize.STRING, allowNull: true },
                device_type: { type: Sequelize.STRING, allowNull: true },
                device_model: { type: Sequelize.STRING, allowNull: true },
                browser: { type: Sequelize.STRING, allowNull: true },
                browser_version: { type: Sequelize.STRING, allowNull: true },
                os: { type: Sequelize.STRING, allowNull: true },
                os_version: { type: Sequelize.STRING, allowNull: true },
                screen_resolution: { type: Sequelize.STRING, allowNull: true },
                language: { type: Sequelize.STRING, allowNull: true },
                first_referrer_url: { type: Sequelize.TEXT, allowNull: true },
                first_referrer_domain: { type: Sequelize.STRING, allowNull: true },
                first_landing_page: { type: Sequelize.STRING(512), allowNull: true },
                first_traffic_source: { type: Sequelize.STRING, allowNull: true },
                first_utm_source: { type: Sequelize.STRING, allowNull: true },
                first_utm_medium: { type: Sequelize.STRING, allowNull: true },
                first_utm_campaign: { type: Sequelize.STRING, allowNull: true },
                first_utm_term: { type: Sequelize.STRING, allowNull: true },
                first_utm_content: { type: Sequelize.STRING, allowNull: true },
                created_at: { type: Sequelize.DATE, allowNull: false },
                updated_at: { type: Sequelize.DATE, allowNull: false }
            });
        }

        if (!existingTables.includes('analytics_sessions')) {
            await queryInterface.createTable('analytics_sessions', {
                session_id: { type: Sequelize.STRING(36), primaryKey: true },
                visitor_id: { type: Sequelize.STRING(36), allowNull: false },
                started_at: { type: Sequelize.DATE, allowNull: false },
                ended_at: { type: Sequelize.DATE, allowNull: true },
                duration_seconds: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                entry_page: { type: Sequelize.STRING(512), allowNull: true },
                exit_page: { type: Sequelize.STRING(512), allowNull: true },
                pages_viewed: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                is_bounce: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
                converted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
                traffic_source: { type: Sequelize.STRING, allowNull: true },
                referrer_url: { type: Sequelize.TEXT, allowNull: true },
                referrer_domain: { type: Sequelize.STRING, allowNull: true },
                utm_source: { type: Sequelize.STRING, allowNull: true },
                utm_medium: { type: Sequelize.STRING, allowNull: true },
                utm_campaign: { type: Sequelize.STRING, allowNull: true },
                utm_term: { type: Sequelize.STRING, allowNull: true },
                utm_content: { type: Sequelize.STRING, allowNull: true },
                device_type: { type: Sequelize.STRING, allowNull: true },
                browser: { type: Sequelize.STRING, allowNull: true },
                os: { type: Sequelize.STRING, allowNull: true },
                country: { type: Sequelize.STRING, allowNull: true },
                region: { type: Sequelize.STRING, allowNull: true },
                city: { type: Sequelize.STRING, allowNull: true },
                created_at: { type: Sequelize.DATE, allowNull: false },
                updated_at: { type: Sequelize.DATE, allowNull: false }
            });
        }

        if (!existingTables.includes('analytics_page_views')) {
            await queryInterface.createTable('analytics_page_views', {
                id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
                session_id: { type: Sequelize.STRING(36), allowNull: false },
                visitor_id: { type: Sequelize.STRING(36), allowNull: false },
                url: { type: Sequelize.STRING(512), allowNull: false },
                page_title: { type: Sequelize.STRING(512), allowNull: true },
                entered_at: { type: Sequelize.DATE, allowNull: false },
                time_on_page_seconds: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
                is_entry_page: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
                created_at: { type: Sequelize.DATE, allowNull: false }
            });
        }

        if (!existingTables.includes('analytics_visitor_events')) {
            await queryInterface.createTable('analytics_visitor_events', {
                id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
                session_id: { type: Sequelize.STRING(36), allowNull: false },
                visitor_id: { type: Sequelize.STRING(36), allowNull: false },
                event_name: { type: Sequelize.STRING, allowNull: false },
                event_category: { type: Sequelize.STRING, allowNull: true },
                page_url: { type: Sequelize.STRING(512), allowNull: true },
                metadata: { type: Sequelize.TEXT, allowNull: true },
                is_conversion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
                created_at: { type: Sequelize.DATE, allowNull: false }
            });
        }

        if (!existingTables.includes('analytics_daily_summary')) {
            await queryInterface.createTable('analytics_daily_summary', {
                id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
                date: { type: Sequelize.DATEONLY, allowNull: false, unique: 'analytics_daily_summary_date_unique' },
                total_visitors: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                new_visitors: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                returning_visitors: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                total_sessions: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                total_page_views: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                avg_session_duration_seconds: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                bounce_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
                conversions: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
                created_at: { type: Sequelize.DATE, allowNull: false },
                updated_at: { type: Sequelize.DATE, allowNull: false }
            });
        }

        // Indexes — every WHERE/ORDER BY/GROUP BY column the dashboard,
        // visitor table, and export queries actually use (see
        // controllers/analytics/*.js), same "index what's queried" approach
        // as 20260728120000-add-performance-indexes.js.
        const visitorIndexes = await queryInterface.showIndex('analytics_visitors');
        if (!hasIndex(visitorIndexes, 'analytics_visitors_first_visit_at')) {
            await queryInterface.addIndex('analytics_visitors', ['first_visit_at'], { name: 'analytics_visitors_first_visit_at' });
        }
        if (!hasIndex(visitorIndexes, 'analytics_visitors_last_visit_at')) {
            await queryInterface.addIndex('analytics_visitors', ['last_visit_at'], { name: 'analytics_visitors_last_visit_at' });
        }

        const sessionIndexes = await queryInterface.showIndex('analytics_sessions');
        if (!hasIndex(sessionIndexes, 'analytics_sessions_visitor_id')) {
            await queryInterface.addIndex('analytics_sessions', ['visitor_id'], { name: 'analytics_sessions_visitor_id' });
        }
        if (!hasIndex(sessionIndexes, 'analytics_sessions_started_at')) {
            await queryInterface.addIndex('analytics_sessions', ['started_at'], { name: 'analytics_sessions_started_at' });
        }
        if (!hasIndex(sessionIndexes, 'analytics_sessions_started_at_traffic_source')) {
            await queryInterface.addIndex('analytics_sessions', ['started_at', 'traffic_source'], { name: 'analytics_sessions_started_at_traffic_source' });
        }
        if (!hasIndex(sessionIndexes, 'analytics_sessions_updated_at')) {
            await queryInterface.addIndex('analytics_sessions', ['updated_at'], { name: 'analytics_sessions_updated_at' });
        }

        const pageViewIndexes = await queryInterface.showIndex('analytics_page_views');
        if (!hasIndex(pageViewIndexes, 'analytics_page_views_session_id')) {
            await queryInterface.addIndex('analytics_page_views', ['session_id'], { name: 'analytics_page_views_session_id' });
        }
        if (!hasIndex(pageViewIndexes, 'analytics_page_views_entered_at')) {
            await queryInterface.addIndex('analytics_page_views', ['entered_at'], { name: 'analytics_page_views_entered_at' });
        }

        const eventIndexes = await queryInterface.showIndex('analytics_visitor_events');
        if (!hasIndex(eventIndexes, 'analytics_visitor_events_session_id')) {
            await queryInterface.addIndex('analytics_visitor_events', ['session_id'], { name: 'analytics_visitor_events_session_id' });
        }
        if (!hasIndex(eventIndexes, 'analytics_visitor_events_event_name')) {
            await queryInterface.addIndex('analytics_visitor_events', ['event_name'], { name: 'analytics_visitor_events_event_name' });
        }
        if (!hasIndex(eventIndexes, 'analytics_visitor_events_created_at')) {
            await queryInterface.addIndex('analytics_visitor_events', ['created_at'], { name: 'analytics_visitor_events_created_at' });
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable('analytics_visitor_events');
        await queryInterface.dropTable('analytics_page_views');
        await queryInterface.dropTable('analytics_sessions');
        await queryInterface.dropTable('analytics_daily_summary');
        await queryInterface.dropTable('analytics_visitors');
    }
};
