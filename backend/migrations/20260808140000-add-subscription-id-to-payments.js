'use strict';

// Adds `payments.subscription_id` — links a recurring UPI Autopay charge
// attempt back to the Subscription it's billing (payment_method:'UPI_AUTOPAY'
// on those rows; the original one-time/registration payment leaves this
// null and is instead pointed to via subscriptions.last_payment_id). See
// backend/services/autopayBilling.service.js. Idempotent (checks column
// existence first) and touches no existing rows — same pattern as
// 20260808120000-add-meta-capi-columns-to-payments.js.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('payments');

        if (!table.subscription_id) {
            await queryInterface.addColumn('payments', 'subscription_id', {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable('payments');

        if (table.subscription_id) {
            await queryInterface.removeColumn('payments', 'subscription_id');
        }
    },
};
