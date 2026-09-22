'use strict';

// Adds the two columns `payments` needs for the TrafficMedia24 affiliate
// postback integration (see CLAUDE.md §26, backend/utils/affiliatePostback.util.js).
// click_id is captured client-side from the visitor's landing URL (see
// src/analytics/affiliateClickId.js) and sent once at checkout
// (POST /api/payments/create) — same reasoning as the existing fbc/fbp
// columns added in 20260808120000-add-meta-capi-columns-to-payments.js.
// affiliate_postback_sent_at marks a *successful* postback send only (left
// null on failure, unlike capi_sent_at, so a failed send stays visible for a
// future retry/reconciliation pass). Idempotent (checks each column's
// existence before adding/removing it) and touches no existing data — same
// pattern as every migration before it in this folder.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('payments');

        if (!table.click_id) {
            await queryInterface.addColumn('payments', 'click_id', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (!table.affiliate_postback_sent_at) {
            await queryInterface.addColumn('payments', 'affiliate_postback_sent_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable('payments');

        if (table.affiliate_postback_sent_at) {
            await queryInterface.removeColumn('payments', 'affiliate_postback_sent_at');
        }
        if (table.click_id) {
            await queryInterface.removeColumn('payments', 'click_id');
        }
    },
};
