'use strict';

// Adds indexes for the WHERE/ORDER BY columns that were previously unindexed
// (confirmed via grep of backend/models — only unique constraints existed
// anywhere in this project before this migration). Under load these columns
// were being full-table-scanned + filesorted on every request:
//   - movies.category_id / (category_id, created_at): "More Like This" query
//     in movie.controller.js getOne, and the ?category_id= filter in getAll
//   - movies.created_at: default list ordering in getAll
//   - hero_banners (status, sorting_position) / show_id: getAll's ?active=1
//     filter + ORDER BY, and the HeroBanner->Movie association JOIN
//   - trays (status, sorting_position): getAll's ?active=1 filter + ORDER BY
//   - subscription_plans (status, sort_order): the existing ?active=1 filter
//     + ORDER BY that PlansPage/AdminSubscriptions already use
// Idempotent (checks existing indexes via showIndex before adding/removing),
// touches no data — same pattern as the existing
// 20260722161015-add-movie-media-columns.js migration.

const hasIndex = (indexes, name) => indexes.some((idx) => idx.name === name);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const movieIndexes = await queryInterface.showIndex('movies');
        if (!hasIndex(movieIndexes, 'movies_category_id')) {
            await queryInterface.addIndex('movies', ['category_id'], { name: 'movies_category_id' });
        }
        if (!hasIndex(movieIndexes, 'movies_category_id_created_at')) {
            await queryInterface.addIndex('movies', ['category_id', 'created_at'], { name: 'movies_category_id_created_at' });
        }
        if (!hasIndex(movieIndexes, 'movies_created_at')) {
            await queryInterface.addIndex('movies', ['created_at'], { name: 'movies_created_at' });
        }

        const heroBannerIndexes = await queryInterface.showIndex('hero_banners');
        if (!hasIndex(heroBannerIndexes, 'hero_banners_status_sorting_position')) {
            await queryInterface.addIndex('hero_banners', ['status', 'sorting_position'], { name: 'hero_banners_status_sorting_position' });
        }
        if (!hasIndex(heroBannerIndexes, 'hero_banners_show_id')) {
            await queryInterface.addIndex('hero_banners', ['show_id'], { name: 'hero_banners_show_id' });
        }

        const trayIndexes = await queryInterface.showIndex('trays');
        if (!hasIndex(trayIndexes, 'trays_status_sorting_position')) {
            await queryInterface.addIndex('trays', ['status', 'sorting_position'], { name: 'trays_status_sorting_position' });
        }

        const subscriptionPlanIndexes = await queryInterface.showIndex('subscription_plans');
        if (!hasIndex(subscriptionPlanIndexes, 'subscription_plans_status_sort_order')) {
            await queryInterface.addIndex('subscription_plans', ['status', 'sort_order'], { name: 'subscription_plans_status_sort_order' });
        }
    },

    async down(queryInterface) {
        const movieIndexes = await queryInterface.showIndex('movies');
        if (hasIndex(movieIndexes, 'movies_category_id')) {
            await queryInterface.removeIndex('movies', 'movies_category_id');
        }
        if (hasIndex(movieIndexes, 'movies_category_id_created_at')) {
            await queryInterface.removeIndex('movies', 'movies_category_id_created_at');
        }
        if (hasIndex(movieIndexes, 'movies_created_at')) {
            await queryInterface.removeIndex('movies', 'movies_created_at');
        }

        const heroBannerIndexes = await queryInterface.showIndex('hero_banners');
        if (hasIndex(heroBannerIndexes, 'hero_banners_status_sorting_position')) {
            await queryInterface.removeIndex('hero_banners', 'hero_banners_status_sorting_position');
        }
        if (hasIndex(heroBannerIndexes, 'hero_banners_show_id')) {
            await queryInterface.removeIndex('hero_banners', 'hero_banners_show_id');
        }

        const trayIndexes = await queryInterface.showIndex('trays');
        if (hasIndex(trayIndexes, 'trays_status_sorting_position')) {
            await queryInterface.removeIndex('trays', 'trays_status_sorting_position');
        }

        const subscriptionPlanIndexes = await queryInterface.showIndex('subscription_plans');
        if (hasIndex(subscriptionPlanIndexes, 'subscription_plans_status_sort_order')) {
            await queryInterface.removeIndex('subscription_plans', 'subscription_plans_status_sort_order');
        }
    },
};
