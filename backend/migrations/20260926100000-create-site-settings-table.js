'use strict';

// Creates `site_settings` — a small key/value table for admin-managed
// page-level settings (first use: the Explore Plans background images,
// desktop + mobile). See backend/models/SiteSetting.js. Purely additive;
// idempotent via a table-existence check, same pattern as the other
// create-table migrations.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const existingTables = await queryInterface.showAllTables();
        if (existingTables.includes('site_settings')) return;

        await queryInterface.createTable('site_settings', {
            key: { type: Sequelize.STRING(100), primaryKey: true },
            value: { type: Sequelize.TEXT, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false },
            updated_at: { type: Sequelize.DATE, allowNull: false },
        });
    },

    async down(queryInterface) {
        const existingTables = await queryInterface.showAllTables();
        if (existingTables.includes('site_settings')) {
            await queryInterface.dropTable('site_settings');
        }
    },
};
