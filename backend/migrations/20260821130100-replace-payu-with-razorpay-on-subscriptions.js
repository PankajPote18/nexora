'use strict';

// Replaces `subscriptions.payu_mandate_ref` with `razorpay_subscription_id`
// — this project switched payment gateways (see CLAUDE.md §9). Idempotent
// and touches no existing rows, same pattern as the sibling payments-table
// migration in this same batch.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('subscriptions');

        if (!table.razorpay_subscription_id) {
            await queryInterface.addColumn('subscriptions', 'razorpay_subscription_id', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (table.payu_mandate_ref) {
            await queryInterface.removeColumn('subscriptions', 'payu_mandate_ref');
        }
    },

    async down(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('subscriptions');

        if (!table.payu_mandate_ref) {
            await queryInterface.addColumn('subscriptions', 'payu_mandate_ref', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (table.razorpay_subscription_id) {
            await queryInterface.removeColumn('subscriptions', 'razorpay_subscription_id');
        }
    },
};
