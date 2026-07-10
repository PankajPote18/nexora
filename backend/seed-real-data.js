const { sequelize } = require('./config/db.config');
const { Movie, Category, HeroBanner, Tray } = require('./models');
const crypto = require('crypto');

sequelize.authenticate().then(async () => {
    try {
        console.log('Fetching real show data from TVMaze...');
        const response = await fetch('https://api.tvmaze.com/shows');
        const showsData = await response.json();
        
        // Use top 100 shows
        const selectedShows = showsData.slice(0, 100);

        console.log('Clearing old data...');
        await Tray.destroy({ where: {} });
        await HeroBanner.destroy({ where: {} });
        await Movie.destroy({ where: {} });
        await Category.destroy({ where: {} });

        console.log('Creating default category...');
        const catId = crypto.randomUUID();
        await Category.create({ id: catId, title: 'General', type: 'Movie' });

        console.log('Seeding real movies...');
        const movieRecords = [];
        for (let i = 0; i < selectedShows.length; i++) {
            const s = selectedShows[i];
            const genres = JSON.stringify(s.genres || ['Drama']);
            
            // Clean HTML from summary
            const summary = s.summary ? s.summary.replace(/<[^>]*>?/gm, '') : 'No description available.';

            movieRecords.push({
                id: s.id.toString(),
                title: s.name,
                category_id: catId,
                posterUrl: s.image?.medium || 'https://placehold.co/400x600',
                backdropUrl: s.image?.original || s.image?.medium || 'https://placehold.co/1920x1080',
                rating: s.rating?.average || (Math.random() * 4 + 6).toFixed(1),
                year: s.premiered ? parseInt(s.premiered.substring(0, 4)) : 2020,
                duration: s.runtime ? `${s.runtime} min` : '2h 10min',
                genres: genres,
                cast: JSON.stringify(['Actor 1', 'Actor 2']), // TVMaze shows endpoint doesn't include cast directly
                description: summary,
                ageRating: '16+',
                isNew: i < 20,
                isTrending: i < 30
            });
        }
        
        await Movie.bulkCreate(movieRecords);

        // -- SEED HERO BANNERS --
        console.log('Seeding Hero Banners...');
        for (let i = 0; i < 6; i++) {
            await HeroBanner.create({
                id: crypto.randomUUID(),
                title: movieRecords[i].title + ' - Featured',
                show_id: movieRecords[i].id,
                sorting_position: i + 1,
                image: movieRecords[i].backdropUrl,
                status: true
            });
        }

        // -- SEED TRAYS --
        console.log('Seeding Trays...');
        const trending = movieRecords.slice(0, 10).map(m => m.id);
        const actionMovies = movieRecords.filter(m => m.genres.includes('Action')).slice(0, 12).map(m => m.id);
        const dramaMovies = movieRecords.filter(m => m.genres.includes('Drama')).slice(0, 12).map(m => m.id);
        const scifiMovies = movieRecords.filter(m => m.genres.includes('Science-Fiction')).slice(0, 12).map(m => m.id);
        const newReleases = movieRecords.slice(0, 12).map(m => m.id);

        const traysToInsert = [
            { title: 'Trending Now', shows: trending, shape: 'trending', sorting_position: 1 },
            { title: 'Action & Adventure', shows: actionMovies.length > 0 ? actionMovies : trending, shape: 'square', sorting_position: 2 },
            { title: 'Critically Acclaimed Dramas', shows: dramaMovies.length > 0 ? dramaMovies : trending, shape: 'square', sorting_position: 3 },
            { title: 'Sci-Fi & Fantasy', shows: scifiMovies.length > 0 ? scifiMovies : trending, shape: 'square', sorting_position: 4 },
            { title: 'New Releases', shows: newReleases, shape: 'square', sorting_position: 5 },
        ];

        for (const t of traysToInsert) {
            await Tray.create({
                id: crypto.randomUUID(),
                title: t.title,
                shows: t.shows,
                shape: t.shape,
                aspect_ratio: '16:9',
                sorting_position: t.sorting_position,
                status: true
            });
        }

        console.log('Successfully seeded 100 real movies and recreated banners/trays!');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
});
