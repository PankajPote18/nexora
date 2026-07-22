const { Movie, Tray, HeroBanner, Category } = require('./models');
const { sequelize } = require('./config/db.config');

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        // Clear existing data so we don't get duplicates
        await HeroBanner.destroy({ where: {} });
        await Tray.destroy({ where: {} });
        await Movie.destroy({ where: {} });
        await Category.destroy({ where: {} });
        console.log('Cleared existing data.');

        const categories = [
            { id: 'hero', title: 'Hero Carousel', type: 'movies' },
            { id: 'action', title: 'Action', type: 'movies' },
            { id: 'drama', title: 'Drama', type: 'movies' },
            { id: 'comedy', title: 'Comedy', type: 'movies' },
            { id: 'scifi', title: 'Sci-Fi', type: 'movies' },
            { id: 'horror', title: 'Horror', type: 'movies' },
            { id: 'romance', title: 'Romance', type: 'movies' },
            { id: 'documentary', title: 'Documentary', type: 'movies' }
        ];
        await Category.bulkCreate(categories);
        console.log('Categories seeded.');

        const movies = [];
        
        // Let's create ~25 movies
        const sampleMovies = [
            // Action
            { id: 'm1', title: 'The Dark Knight', category_id: 'action', posterUrl: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1920&auto=format', year: 2008, rating: 9.0, genres: '["Action", "Drama"]', duration: '2h 32m', isNew: false, isTrending: true, isOriginal: false, ageRating: 'U/A 13+' },
            { id: 'm2', title: 'Inception', category_id: 'action', posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1920&auto=format', year: 2010, rating: 8.8, genres: '["Action", "Sci-Fi"]', duration: '2h 28m', isNew: false, isTrending: true, isOriginal: true, ageRating: 'U/A 13+' },
            { id: 'm3', title: 'Gladiator', category_id: 'action', posterUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?w=1920&auto=format', year: 2000, rating: 8.5, genres: '["Action", "Drama"]', duration: '2h 35m', isNew: false, isTrending: false, isOriginal: false, ageRating: 'A' },
            { id: 'm4', title: 'Mad Max: Fury Road', category_id: 'action', posterUrl: 'https://images.unsplash.com/photo-1533613220915-609f661a6fe1?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1533613220915-609f661a6fe1?w=1920&auto=format', year: 2015, rating: 8.1, genres: '["Action", "Sci-Fi"]', duration: '2h 0m', isNew: true, isTrending: true, isOriginal: false, ageRating: 'A' },
            
            // Sci-Fi
            { id: 'm5', title: 'Interstellar', category_id: 'scifi', posterUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&auto=format', year: 2014, rating: 8.6, genres: '["Drama", "Sci-Fi"]', duration: '2h 49m', isNew: false, isTrending: true, isOriginal: false, ageRating: 'U' },
            { id: 'm6', title: 'The Matrix', category_id: 'scifi', posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&auto=format', year: 1999, rating: 8.7, genres: '["Action", "Sci-Fi"]', duration: '2h 16m', isNew: false, isTrending: true, isOriginal: false, ageRating: 'U/A 13+' },
            { id: 'm7', title: 'Blade Runner 2049', category_id: 'scifi', posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&auto=format', year: 2017, rating: 8.0, genres: '["Action", "Sci-Fi"]', duration: '2h 44m', isNew: false, isTrending: false, isOriginal: true, ageRating: 'A' },
            
            // Drama
            { id: 'm8', title: 'The Shawshank Redemption', category_id: 'drama', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&auto=format', year: 1994, rating: 9.3, genres: '["Drama"]', duration: '2h 22m', isNew: false, isTrending: false, isOriginal: false, ageRating: 'U/A 13+' },
            { id: 'm9', title: 'Fight Club', category_id: 'drama', posterUrl: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=1920&auto=format', year: 1999, rating: 8.8, genres: '["Drama"]', duration: '2h 19m', isNew: false, isTrending: false, isOriginal: false, ageRating: 'A' },
            { id: 'm10', title: 'Forrest Gump', category_id: 'drama', posterUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1920&auto=format', year: 1994, rating: 8.8, genres: '["Drama", "Romance"]', duration: '2h 22m', isNew: false, isTrending: false, isOriginal: false, ageRating: 'U' },

            // Series (Continue Watching test)
            { id: '11', title: 'Stranger Things', category_id: 'scifi', posterUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&auto=format', year: 2016, rating: 8.7, genres: '["Action", "Horror"]', duration: '4 Seasons', isNew: true, isTrending: true, isOriginal: true, ageRating: 'U/A 13+' },
            { id: '16', title: 'The Witcher', category_id: 'action', posterUrl: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1920&auto=format', year: 2019, rating: 8.2, genres: '["Action", "Fantasy"]', duration: '3 Seasons', isNew: false, isTrending: true, isOriginal: true, ageRating: 'A' },
            { id: '17', title: 'Breaking Bad', category_id: 'drama', posterUrl: 'https://images.unsplash.com/photo-1580250642511-1660fe42ad58?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1580250642511-1660fe42ad58?w=1920&auto=format', year: 2008, rating: 9.5, genres: '["Drama", "Crime"]', duration: '5 Seasons', isNew: false, isTrending: true, isOriginal: false, ageRating: 'A' },
            { id: '18', title: 'The Boys', category_id: 'action', posterUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1920&auto=format', year: 2019, rating: 8.7, genres: '["Action", "Comedy"]', duration: '3 Seasons', isNew: true, isTrending: true, isOriginal: true, ageRating: 'A' },
            { id: '19', title: 'Narcos', category_id: 'drama', posterUrl: 'https://images.unsplash.com/photo-1587889384594-c7bc1f2b694b?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1587889384594-c7bc1f2b694b?w=1920&auto=format', year: 2015, rating: 8.8, genres: '["Drama", "Crime"]', duration: '3 Seasons', isNew: false, isTrending: false, isOriginal: true, ageRating: 'A' },
            
            // More fillers
            { id: 'm16', title: 'Titanic', category_id: 'romance', posterUrl: 'https://images.unsplash.com/photo-1604085572504-a392ddf0d86a?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1604085572504-a392ddf0d86a?w=1920&auto=format', year: 1997, rating: 7.9, genres: '["Drama", "Romance"]', duration: '3h 14m', isNew: false, isTrending: true, isOriginal: false, ageRating: 'U/A 13+' },
            { id: 'm17', title: 'The Avengers', category_id: 'action', posterUrl: 'https://images.unsplash.com/photo-1560930950-5c20d81c1597?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1560930950-5c20d81c1597?w=1920&auto=format', year: 2012, rating: 8.0, genres: '["Action", "Sci-Fi"]', duration: '2h 23m', isNew: false, isTrending: false, isOriginal: false, ageRating: 'U/A 13+' },
            { id: 'm18', title: 'Parasite', category_id: 'drama', posterUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=1920&auto=format', year: 2019, rating: 8.5, genres: '["Drama", "Thriller"]', duration: '2h 12m', isNew: false, isTrending: true, isOriginal: false, ageRating: 'A' },
            { id: 'm19', title: 'Joker', category_id: 'drama', posterUrl: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=1920&auto=format', year: 2019, rating: 8.4, genres: '["Drama", "Crime"]', duration: '2h 2m', isNew: true, isTrending: true, isOriginal: false, ageRating: 'A' },
            { id: 'm20', title: 'Spider-Man: No Way Home', category_id: 'action', posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=500&auto=format', backdropUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=1920&auto=format', year: 2021, rating: 8.3, genres: '["Action", "Adventure"]', duration: '2h 28m', isNew: true, isTrending: true, isOriginal: false, ageRating: 'U/A 13+' }
        ];

        await Movie.bulkCreate(sampleMovies);
        console.log('Movies seeded.');

        const heroBanners = [
            { id: 'hb1', show_id: 'm1', title: 'The Dark Knight', image: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1920&auto=format', status: true, sorting_position: 1 },
            { id: 'hb2', show_id: 'm5', title: 'Interstellar', image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&auto=format', status: true, sorting_position: 2 },
            { id: 'hb3', show_id: '11', title: 'Stranger Things', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&auto=format', status: true, sorting_position: 3 },
            { id: 'hb4', show_id: 'm20', title: 'Spider-Man', image: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=1920&auto=format', status: true, sorting_position: 4 },
        ];

        await HeroBanner.bulkCreate(heroBanners);
        console.log('Hero Banners seeded.');

        const trays = [
            { title: 'Top 10 in your Country', type: 'movies', shape: 'rectangle', sorting_position: 1, status: true, shows: ['m20', '18', 'm2', 'm1', '11', '17', 'm6', 'm18', 'm5', 'm19'] },
            { title: 'Trending Now', type: 'movies', shape: 'square', sorting_position: 2, status: true, shows: ['m4', 'm5', 'm19', '11', '16', 'm16', '18', '17'] },
            { title: 'Blockbuster Action Movies', type: 'movies', shape: 'rectangle', sorting_position: 3, status: true, shows: ['m1', 'm2', 'm3', 'm4', '16', '18', 'm17', 'm20'] },
            { title: 'Award-Winning Dramas', type: 'movies', shape: 'circle', sorting_position: 4, status: true, shows: ['m8', 'm9', 'm10', '17', '19', 'm18', 'm19'] },
            { title: 'ClickBuz Originals', type: 'movies', shape: 'rectangle', sorting_position: 5, status: true, shows: ['m2', 'm7', '11', '16', '18', '19'] }
        ];

        await Tray.bulkCreate(trays);
        console.log('Trays seeded.');

        console.log('Successfully seeded LOTS of dummy data!');
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
};

run();
