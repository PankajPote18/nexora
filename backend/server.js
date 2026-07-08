require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./config/db.config');
const { Genre, Language, AgeCertificate, MatureTheme, Badge, Vendor } = require('./models');

const PORT = process.env.PORT || 5000;

const seedMasterData = async () => {
    // Seed Genres
    const genreCount = await Genre.count();
    if (genreCount === 0) {
        await Genre.bulkCreate([
            { name: 'Action', sort_order: 1 },
            { name: 'Comedy', sort_order: 2 },
            { name: 'Drama', sort_order: 3 },
            { name: 'Romantic', sort_order: 4 },
        ]);
    }

    // Seed Languages
    const langCount = await Language.count();
    if (langCount === 0) {
        await Language.bulkCreate([
            { name: 'English', code: 'Eng', sort_order: 1 },
            { name: 'Hindi', code: 'Hi', sort_order: 2 },
            { name: 'Marathi', code: 'Mar', sort_order: 3 },
        ]);
    }

    // Seed Age Certificates
    const ageCount = await AgeCertificate.count();
    if (ageCount === 0) {
        await AgeCertificate.bulkCreate([
            { name: 'U', description: 'Universal - suitable for all ages', sort_order: 1 },
            { name: 'U/A 13+', description: 'Parental guidance for children under 13', sort_order: 2 },
            { name: 'A', description: 'Adults only (18+)', sort_order: 3 },
        ]);
    }

    // Seed Mature Themes
    const themeCount = await MatureTheme.count();
    if (themeCount === 0) {
        await MatureTheme.bulkCreate([
            { name: 'None', sort_order: 1 },
            { name: 'Violence', sort_order: 2 },
            { name: 'Sexual', sort_order: 3 },
        ]);
    }

    // Seed Badges
    const badgeCount = await Badge.count();
    if (badgeCount === 0) {
        await Badge.bulkCreate([
            { name: 'Hot', bg_color: '#670005', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 1 },
            { name: 'New', bg_color: '#014207', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 2 },
            { name: 'Original', bg_color: '#292929', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 3 },
        ]);
    }

    // Seed Vendors
    const vendorCount = await Vendor.count();
    if (vendorCount === 0) {
        await Vendor.bulkCreate([
            { name: 'Vendor A' },
            { name: 'Vendor B' },
            { name: 'Vendor C' },
        ]);
    }
};

// Test DB Connection and Start Server
sequelize.authenticate()
    .then(() => {
        console.log('Database connection has been established successfully.');
        
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });
