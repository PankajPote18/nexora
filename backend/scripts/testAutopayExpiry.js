// One-off ops script (see CLAUDE.md §17 — this project's "run manually via
// `node backend/<file>.js`" convention) for testing the autopay billing
// pipeline (jobs|queues|workers/autopayBilling.* + services/autopayBilling.
// service.js) without waiting real days for a subscription to actually
// expire. Sets exactly ONE Subscription row's expires_at to a few minutes
// from now, so the billing cron picks it up on its next tick.
//
// Deliberately a one-off script rather than a standing env flag
// (AUTOPAY_TEST_MODE=true) — an env flag left on in a real .env would
// silently compress every subscription's billing cycle in production. This
// script can only ever touch the one row you point it at.
//
// Usage:
//   node backend/scripts/testAutopayExpiry.js --phone 9999999999 --minutes 3
//   node backend/scripts/testAutopayExpiry.js --id 5 --minutes 2
// (or `npm run autopay:test-expiry -- --phone 9999999999 --minutes 3` from backend/)

require('dotenv').config();
const { Subscription } = require('../models');
const { sequelize } = require('../config/db.config');

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].slice(2);
            const value = argv[i + 1];
            args[key] = value;
            i++;
        }
    }
    return args;
}

const run = async () => {
    const args = parseArgs(process.argv.slice(2));
    const minutes = parseFloat(args.minutes) || 3;

    if (!args.id && !args.phone) {
        console.error('Usage: node backend/scripts/testAutopayExpiry.js --phone <phone> [--minutes 3]');
        console.error('   or: node backend/scripts/testAutopayExpiry.js --id <subscriptionId> [--minutes 3]');
        process.exit(1);
    }

    try {
        await sequelize.authenticate();

        let subscription;
        if (args.id) {
            subscription = await Subscription.findByPk(args.id);
        } else {
            subscription = await Subscription.findOne({
                where: { customer_phone: args.phone },
                order: [['created_at', 'DESC']]
            });
        }

        if (!subscription) {
            console.error(`No subscription found for ${args.id ? `id=${args.id}` : `phone=${args.phone}`}`);
            process.exit(1);
        }

        const newExpiresAt = new Date(Date.now() + minutes * 60000);
        await subscription.update({ expires_at: newExpiresAt });

        console.log('Subscription expiry compressed for testing:');
        console.log(`  id: ${subscription.id}`);
        console.log(`  customer_phone: ${subscription.customer_phone}`);
        console.log(`  autopay_enabled: ${subscription.autopay_enabled}`);
        console.log(`  mandate_status: ${subscription.mandate_status}`);
        console.log(`  new expires_at: ${newExpiresAt.toISOString()} (~${minutes} minute(s) from now)`);

        if (!subscription.autopay_enabled || subscription.mandate_status !== 'active') {
            console.warn('WARNING: autopay_enabled is not true and/or mandate_status is not "active" — the autopay billing cron will NOT pick this subscription up until both are set (complete a real UPI Autopay checkout first).');
        } else {
            console.log('This subscription will be picked up by the autopay billing cron on its next tick.');
        }
    } catch (err) {
        console.error('Failed to update subscription expiry:', err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
};

run();
