const { sequelize } = require('./config/db.config');
const { Tray, Movie } = require('./models');
const crypto = require('crypto');

sequelize.authenticate().then(async () => {
    try {
        await sequelize.sync({ alter: true });
        const movies = await Movie.findAll();
        
        if (movies.length === 0) {
            console.log('No movies found to seed trays!');
            process.exit(1);
        }

        // Helper logic from old UI
        const trending = [...movies].sort((a, b) => b.rating - a.rating).slice(0, 10).map(m => m.id);

        const isBollywood = (m) => {
          const bollywoodActors = ["Kapoor", "Dimri", "Tiwary", "Varma", "Devgn", "Bachchan", "Singh", "Kasturia", "Parihar", "Vijay", "Shahid", "Amitabh", "Ajay", "Rao", "Ayushmann", "Tripathi", "Pankaj", "Manoj", "Bhatt", "Kaushal", "Ranbir", "Alia", "Deepika"];
          const castStr = Array.isArray(m.cast) ? m.cast.join(" ") : typeof m.cast === 'string' ? m.cast : "";
          const titleStr = (m.title || "").toLowerCase();
          return bollywoodActors.some(name => castStr.includes(name)) ||
            titleStr.includes("romeo") || titleStr.includes("matka") || titleStr.includes("runway") || titleStr.includes("aspirants") ||
            (parseInt(m.id) % 3 === 1 && m.id > 10);
        };

        const allMoviesList = movies.filter(m => {
          const durationStr = (m.duration || "").toLowerCase();
          return durationStr.includes('h') || durationStr.includes('min') || durationStr.includes('hr');
        }).slice(0, 12).map(m => m.id);

        let allWebseriesList = movies.filter(m => {
          const durationStr = (m.duration || "").toLowerCase();
          return durationStr.includes('season') || durationStr.includes('seasons') || durationStr.includes('ep') || durationStr.includes('series');
        }).slice(0, 12).map(m => m.id);
        
        if (allWebseriesList.length === 0) {
            allWebseriesList = movies.filter(m => m.id % 2 !== 0).slice(0, 12).map(m => m.id);
        }

        let topHollywood = movies.filter(m => !isBollywood(m)).slice(0, 12).map(m => m.id);
        if (topHollywood.length === 0) topHollywood = movies.slice(0, 12).map(m => m.id);

        let topBollywood = movies.filter(m => isBollywood(m)).slice(0, 12).map(m => m.id);
        if (topBollywood.length === 0) topBollywood = movies.slice(0, 12).map(m => m.id);

        const recentlyAdded = [...movies].sort((a, b) => b.year - a.year).slice(0, 12).map(m => m.id);

        const traysToInsert = [
            { title: 'Trending Now', shows: trending, shape: 'trending', sorting_position: 1 },
            { title: 'Movies', shows: allMoviesList, shape: 'square', sorting_position: 2 },
            { title: 'Webseries', shows: allWebseriesList, shape: 'square', sorting_position: 3 },
            { title: 'Top Hollywood', shows: topHollywood, shape: 'square', sorting_position: 4 },
            { title: 'Top Bollywood', shows: topBollywood, shape: 'square', sorting_position: 5 },
            { title: 'Recently Added', shows: recentlyAdded, shape: 'square', sorting_position: 6 },
        ];

        await Tray.destroy({ where: {}, truncate: true });

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
        
        console.log(`Seeded ${traysToInsert.length} trays successfully!`);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
});
