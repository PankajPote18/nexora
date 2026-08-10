'use strict';

// Adds columns `payments` needs to support a server-side Meta Conversions API
// (CAPI) mirror of the CompleteRegistration event already fired client-side
// (see src/analytics/metaEvents.js). fbc/fbp/client_ip/client_user_agent are
// only ever available from the user's actual browser at checkout
// (POST /api/payments/create) — reconcileWithPayu() (payment.controller.js),
// the single place a payment's status becomes 'success', is reached from
// PayU's S2S webhook and has no request/browser context at all, so this
// browser-time data must be captured once and persisted here for later use.
// meta_event_id is the id shared with the client-side Pixel call so Meta can
// dedupe the two events into one; capi_sent_at marks a CAPI send attempt so a
// webhook retry never re-sends the same conversion twice. Idempotent (checks
// for each column's existence before adding/removing it) and touches no
// existing data — same pattern as 20260722161015-add-movie-media-columns.js.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('payments');

        if (!table.fbc) {
            await queryInterface.addColumn('payments', 'fbc', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (!table.fbp) {
            await queryInterface.addColumn('payments', 'fbp', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (!table.client_ip) {
            await queryInterface.addColumn('payments', 'client_ip', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (!table.client_user_agent) {
            await queryInterface.addColumn('payments', 'client_user_agent', {
                type: Sequelize.STRING(512),
                allowNull: true,
            });
        }
        if (!table.meta_event_id) {
            await queryInterface.addColumn('payments', 'meta_event_id', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (!table.capi_sent_at) {
            await queryInterface.addColumn('payments', 'capi_sent_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable('payments');

        if (table.capi_sent_at) {
            await queryInterface.removeColumn('payments', 'capi_sent_at');
        }
        if (table.meta_event_id) {
            await queryInterface.removeColumn('payments', 'meta_event_id');
        }
        if (table.client_user_agent) {
            await queryInterface.removeColumn('payments', 'client_user_agent');
        }
        if (table.client_ip) {
            await queryInterface.removeColumn('payments', 'client_ip');
        }
        if (table.fbp) {
            await queryInterface.removeColumn('payments', 'fbp');
        }
        if (table.fbc) {
            await queryInterface.removeColumn('payments', 'fbc');
        }
    },
};
