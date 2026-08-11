'use strict';

// Removes subscription_plans.discounted_price — the discount-tier concept
// (struck-through original price + a separate charged discounted price) has
// been removed from both the admin UI and the public /plans page; plans are
// now a single flat original_price, which is also what payment.controller.js
// and autopayBilling.service.js charge going forward. Idempotent (checks
// describeTable before adding/removing), same pattern as this project's
// earlier migrations.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const table = await queryInterface.describeTable('subscription_plans');
        if (table.discounted_price) {
            await queryInterface.removeColumn('subscription_plans', 'discounted_price');
        }
    },

    async down(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('subscription_plans');
        if (!table.discounted_price) {
            await queryInterface.addColumn('subscription_plans', 'discounted_price', {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0,
            });
        }
    },
};
