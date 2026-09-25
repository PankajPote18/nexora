'use strict';

// Removes the duplicate UNIQUE indexes that sequelize.sync({ alter: true })
// piled up on every backend boot (users.email -> email, email_2, ... ;
// same for payments.txnid and settings_pages.slug). MySQL caps a table at 64
// keys, and hitting it stops the backend from starting (ER_TOO_MANY_KEYS).
// See server.js's DB_SYNC_MODE comment — production no longer runs alter, so
// once this has run the duplicates stop coming back.
//
// Keeps exactly one single-column UNIQUE index per column (preferring the one
// named after the column itself), so uniqueness is never lost. Drops indexes
// only — no row is read, changed or deleted. Idempotent: a column that already
// has a single unique index is left alone.

const TARGETS = [
    ['users', 'email'],
    ['payments', 'txnid'],
    ['settings_pages', 'slug'],
    ['analytics_daily_summary', 'date'],
];

async function uniqueIndexesOn(queryInterface, table, column) {
    const [rows] = await queryInterface.sequelize.query(
        `SELECT index_name AS name, COUNT(*) AS cols, SUM(column_name = :column) AS hits
           FROM information_schema.statistics
          WHERE table_schema = DATABASE() AND table_name = :table
            AND non_unique = 0 AND index_name <> 'PRIMARY'
          GROUP BY index_name`,
        { replacements: { table, column } }
    );
    // Single-column unique indexes on exactly this column.
    return rows.filter((r) => Number(r.cols) === 1 && Number(r.hits) === 1).map((r) => r.name);
}

module.exports = {
    async up(queryInterface) {
        for (const [table, column] of TARGETS) {
            const tables = await queryInterface.showAllTables();
            if (!tables.includes(table)) continue;

            const names = await uniqueIndexesOn(queryInterface, table, column);
            if (names.length <= 1) continue;

            const keep = names.includes(column) ? column : names.sort()[0];
            for (const name of names) {
                if (name === keep) continue;
                await queryInterface.removeIndex(table, name);
            }
            console.log(`[dedupe-unique-indexes] ${table}.${column}: kept "${keep}", dropped ${names.length - 1} duplicate(s)`);
        }
    },

    // Nothing to restore — the dropped indexes were exact duplicates of the
    // one that remains.
    async down() {},
};
