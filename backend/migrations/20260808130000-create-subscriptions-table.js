'use strict';

// Creates the `subscriptions` table — tracks which plan a customer is on,
// when it expires, and (optionally) their PayU UPI Autopay mandate for
// auto-renewal. See backend/models/Subscription.js and CLAUDE.md §9/§22.
// Purely additive; idempotent via a table-existence check, same pattern as
// 20260731090000-create-analytics-tables.js.

const hasIndex = (indexes, name) => indexes.some((idx) => idx.name === name);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const existingTables = await queryInterface.showAllTables();

        if (!existingTables.includes('subscriptions')) {
            await queryInterface.createTable('subscriptions', {
                id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
                customer_phone: { type: Sequelize.STRING, allowNull: false },
                customer_email: { type: Sequelize.STRING, allowNull: true },
                plan_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
                status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'active' },
                expires_at: { type: Sequelize.DATE, allowNull: false },
                autopay_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
                payu_mandate_ref: { type: Sequelize.STRING, allowNull: true },
                mandate_status: { type: Sequelize.STRING, allowNull: true },
                last_billed_at: { type: Sequelize.DATE, allowNull: true },
                last_payment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
                failed_attempt_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
                created_at: { type: Sequelize.DATE, allowNull: false },
                updated_at: { type: Sequelize.DATE, allowNull: false }
            });
        }

        // Covers the autopay billing cron's exact WHERE clause (see
        // services/autopayBilling.service.js's getDueSubscriptions).
        const indexes = await queryInterface.showIndex('subscriptions');
        if (!hasIndex(indexes, 'subscriptions_autopay_due_lookup')) {
            await queryInterface.addIndex(
                'subscriptions',
                ['autopay_enabled', 'mandate_status', 'status', 'expires_at'],
                { name: 'subscriptions_autopay_due_lookup' }
            );
        }
        if (!hasIndex(indexes, 'subscriptions_customer_phone')) {
            await queryInterface.addIndex('subscriptions', ['customer_phone'], { name: 'subscriptions_customer_phone' });
        }
    },

    async down(queryInterface) {
        const existingTables = await queryInterface.showAllTables();
        if (existingTables.includes('subscriptions')) {
            await queryInterface.dropTable('subscriptions');
        }
    }
};
