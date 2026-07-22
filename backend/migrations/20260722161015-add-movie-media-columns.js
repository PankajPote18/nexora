'use strict';

// Adds videoUrl/trailerUrl/subtitleUrl to `movies` — these columns have been
// defined on the Movie model (backend/models/Movie.js) since earlier work on
// the Bunny Storage upload feature, but were never applied to the live table
// because sequelize.sync({ alter: true }) was deliberately not run against
// production. This migration is idempotent (checks for each column's
// existence before adding/removing it) and touches no existing data or rows —
// only adds/removes nullable columns.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('movies');

        if (!table.videoUrl) {
            await queryInterface.addColumn('movies', 'videoUrl', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (!table.trailerUrl) {
            await queryInterface.addColumn('movies', 'trailerUrl', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (!table.subtitleUrl) {
            await queryInterface.addColumn('movies', 'subtitleUrl', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable('movies');

        if (table.subtitleUrl) {
            await queryInterface.removeColumn('movies', 'subtitleUrl');
        }
        if (table.trailerUrl) {
            await queryInterface.removeColumn('movies', 'trailerUrl');
        }
        if (table.videoUrl) {
            await queryInterface.removeColumn('movies', 'videoUrl');
        }
    },
};
