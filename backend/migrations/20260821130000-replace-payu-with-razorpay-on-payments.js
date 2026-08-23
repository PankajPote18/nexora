'use strict';

// Replaces PayU-specific columns on `payments` with their Razorpay
// equivalents — this project switched payment gateways (see CLAUDE.md §9).
// Idempotent (checks each column's existence before adding/removing it) and
// touches no existing rows — same pattern as
// 20260808120000-add-meta-capi-columns-to-payments.js. Per CLAUDE.md §20,
// this is a new migration rather than an edit to any past one.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('payments');

        if (!table.razorpay_order_id) {
            await queryInterface.addColumn('payments', 'razorpay_order_id', { type: Sequelize.STRING, allowNull: true });
        }
        if (!table.razorpay_payment_id) {
            await queryInterface.addColumn('payments', 'razorpay_payment_id', { type: Sequelize.STRING, allowNull: true });
        }
        if (!table.razorpay_signature) {
            await queryInterface.addColumn('payments', 'razorpay_signature', { type: Sequelize.STRING, allowNull: true });
        }
        if (!table.razorpay_method) {
            await queryInterface.addColumn('payments', 'razorpay_method', { type: Sequelize.STRING, allowNull: true });
        }
        if (!table.razorpay_bank_ref) {
            await queryInterface.addColumn('payments', 'razorpay_bank_ref', { type: Sequelize.STRING, allowNull: true });
        }
        if (!table.razorpay_response) {
            await queryInterface.addColumn('payments', 'razorpay_response', { type: Sequelize.TEXT('long'), allowNull: true });
        }

        if (table.payu_mihpayid) {
            await queryInterface.removeColumn('payments', 'payu_mihpayid');
        }
        if (table.payu_reference_id) {
            await queryInterface.removeColumn('payments', 'payu_reference_id');
        }
        if (table.payu_bank_ref_num) {
            await queryInterface.removeColumn('payments', 'payu_bank_ref_num');
        }
        if (table.payu_mode) {
            await queryInterface.removeColumn('payments', 'payu_mode');
        }
        if (table.payu_response) {
            await queryInterface.removeColumn('payments', 'payu_response');
        }
    },

    async down(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('payments');

        if (!table.payu_mihpayid) {
            await queryInterface.addColumn('payments', 'payu_mihpayid', { type: Sequelize.STRING, allowNull: true });
        }
        if (!table.payu_reference_id) {
            await queryInterface.addColumn('payments', 'payu_reference_id', { type: Sequelize.STRING, allowNull: true });
        }
        if (!table.payu_bank_ref_num) {
            await queryInterface.addColumn('payments', 'payu_bank_ref_num', { type: Sequelize.STRING, allowNull: true });
        }
        if (!table.payu_mode) {
            await queryInterface.addColumn('payments', 'payu_mode', { type: Sequelize.STRING, allowNull: true });
        }
        if (!table.payu_response) {
            await queryInterface.addColumn('payments', 'payu_response', { type: Sequelize.TEXT('long'), allowNull: true });
        }

        if (table.razorpay_order_id) {
            await queryInterface.removeColumn('payments', 'razorpay_order_id');
        }
        if (table.razorpay_payment_id) {
            await queryInterface.removeColumn('payments', 'razorpay_payment_id');
        }
        if (table.razorpay_signature) {
            await queryInterface.removeColumn('payments', 'razorpay_signature');
        }
        if (table.razorpay_method) {
            await queryInterface.removeColumn('payments', 'razorpay_method');
        }
        if (table.razorpay_bank_ref) {
            await queryInterface.removeColumn('payments', 'razorpay_bank_ref');
        }
        if (table.razorpay_response) {
            await queryInterface.removeColumn('payments', 'razorpay_response');
        }
    },
};
