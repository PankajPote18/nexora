const { sequelize } = require('./config/db.config');
const { HeroBanner, Movie } = require('./models');
const crypto = require('crypto');

sequelize.authenticate().then(async () => {
    try {
        // Find 6 movies
        const movies = await Movie.findAll({ limit: 6 });
        
        if (movies.length === 0) {
            console.log('No movies found to seed banners!');
            process.exit(1);
        }

        const cinematicBackgrounds = [
            'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=2069&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1604085572504-a392ddf0d86a?q=80&w=2126&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?q=80&w=2073&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1920&auto=format&fit=crop'
        ];

        // Clear existing banners
        await HeroBanner.destroy({ where: {}, truncate: true });

        for (let i = 0; i < movies.length; i++) {
            await HeroBanner.create({
                id: crypto.randomUUID(),
                title: movies[i].title + ' - Featured',
                show_id: movies[i].id,
                sorting_position: i + 1,
                image: cinematicBackgrounds[i],
                status: true
            });
        }
        
        console.log(`Seeded ${movies.length} hero banners successfully!`);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
});
