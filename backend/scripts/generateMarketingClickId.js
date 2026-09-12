// One-off ops script (see CLAUDE.md §17 — this project's "run manually via
// `node backend/<file>.js`" convention, same as scripts/downloadGeoDb.js).
// Generates ONE candidate value for MARKETING_CLICK_ID (see CLAUDE.md §25) —
// this project's single, stable, integration-level marketing/affiliate
// identifier. This is NOT a per-visitor id: it is generated once, ever,
// during integration setup, and then reused unchanged for the life of the
// integration.
//
// Deliberately does not write to backend/.env itself — that file is always
// human-managed in this project (see .env.example), and a script silently
// overwriting an already-configured MARKETING_CLICK_ID would risk breaking
// a live integration the marketing team is already using. Copy the printed
// value into backend/.env yourself.
//
// Deliberately NOT crypto.randomUUID() — this project's per-visitor
// analytics id (src/analytics/tracker.js's getOrCreateVisitorId()) already
// uses that exact call for a completely different purpose (see CLAUDE.md
// §25's "visitor_id and click_id are separate" note); using the same
// generator/shape here would invite exactly the mix-up this identifier
// needs to stay independent of. Uses raw crypto.randomBytes instead,
// base36-encoded and uppercased, which also happens to look nothing like a
// UUID at a glance.
//
// Usage: node backend/scripts/generateMarketingClickId.js
//    or: npm run marketing:generate-click-id   (from backend/)
//
// Run this exactly once. Re-running it is harmless (it never touches any
// file), but only the value you actually paste into backend/.env and hand
// to the marketing team is the one that matters — running it again does
// NOT rotate or regenerate anything already configured.

const crypto = require('crypto');

function generateMarketingClickId() {
    // 15 random bytes of entropy, base36-encoded (uppercased) — plenty for a
    // single identifier that's generated once and never rotated.
    const bytes = crypto.randomBytes(15);
    const random = BigInt('0x' + bytes.toString('hex')).toString(36).toUpperCase();
    return `CBMKT-${random}`;
}

if (require.main === module) {
    const id = generateMarketingClickId();

    console.log('\nGenerated a candidate marketing Click ID:\n');
    console.log(`  ${id}\n`);
    console.log('Next steps:');
    console.log('  1. Add it to backend/.env:');
    console.log(`       MARKETING_CLICK_ID=${id}`);
    console.log('  2. Give this exact value to the marketing team.');
    console.log('  3. Do not run this script again for the same integration —');
    console.log('     the Click ID must stay stable once configured and shared.\n');
}

module.exports = { generateMarketingClickId };
