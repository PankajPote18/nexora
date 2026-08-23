'use strict';

// Adds `subscription_plans.razorpay_plan_id` — caches the Razorpay Plan id
// created lazily the first time a customer opts into autopay for a given
// SubscriptionPlan (see backend/controllers/payment.controller.js's
// createPayment), since Razorpay has no "get or create" endpoint of its own
// and every subscriber of the same plan reuses the same Razorpay Plan.
// Idempotent and touches no existing rows.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('subscription_plans');

        if (!table.razorpay_plan_id) {
            await queryInterface.addColumn('subscription_plans', 'razorpay_plan_id', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable('subscription_plans');

        if (table.razorpay_plan_id) {
            await queryInterface.removeColumn('subscription_plans', 'razorpay_plan_id');
        }
    },
};
