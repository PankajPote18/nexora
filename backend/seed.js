const { sequelize } = require('./config/db.config');
const { Genre, Language, AgeCertificate, MatureTheme, Badge, Vendor } = require('./models');

const seedMasterData = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        
        await sequelize.sync({ alter: true });
        console.log('Tables synced');

        // Seed Genres
        const genreCount = await Genre.count();
        if (genreCount === 0) {
            await Genre.bulkCreate([
                { name: 'Action', sort_order: 1 },
                { name: 'Comedy', sort_order: 2 },
                { name: 'Drama', sort_order: 3 },
                { name: 'Romantic', sort_order: 4 },
                { name: 'Sci-Fi', sort_order: 5 },
                { name: 'Horror', sort_order: 6 }
            ]);
            console.log('Seeded Genres');
        } else {
            console.log('Genres already seeded');
        }

        // Seed Languages
        const langCount = await Language.count();
        if (langCount === 0) {
            await Language.bulkCreate([
                { name: 'English', code: 'Eng', sort_order: 1 },
                { name: 'Hindi', code: 'Hi', sort_order: 2 },
                { name: 'Marathi', code: 'Mar', sort_order: 3 },
                { name: 'Tamil', code: 'Tam', sort_order: 4 },
                { name: 'Telugu', code: 'Tel', sort_order: 5 }
            ]);
            console.log('Seeded Languages');
        } else {
            console.log('Languages already seeded');
        }

        // Seed Age Certificates
        const ageCount = await AgeCertificate.count();
        if (ageCount === 0) {
            await AgeCertificate.bulkCreate([
                { name: 'U', description: 'Universal - suitable for all ages', sort_order: 1 },
                { name: 'U/A 7+', description: 'Parental guidance for children under 7', sort_order: 2 },
                { name: 'U/A 13+', description: 'Parental guidance for children under 13', sort_order: 3 },
                { name: 'U/A 16+', description: 'Parental guidance for children under 16', sort_order: 4 },
                { name: 'A', description: 'Adults only (18+)', sort_order: 5 },
            ]);
            console.log('Seeded Age Certificates');
        } else {
            console.log('Age Certificates already seeded');
        }

        // Seed Mature Themes
        const themeCount = await MatureTheme.count();
        if (themeCount === 0) {
            await MatureTheme.bulkCreate([
                { name: 'None', sort_order: 1 },
                { name: 'Violence', sort_order: 2 },
                { name: 'Sexual Content', sort_order: 3 },
                { name: 'Strong Language', sort_order: 4 },
                { name: 'Substance Abuse', sort_order: 5 }
            ]);
            console.log('Seeded Mature Themes');
        } else {
            console.log('Mature Themes already seeded');
        }

        // Seed Badges
        const badgeCount = await Badge.count();
        if (badgeCount === 0) {
            await Badge.bulkCreate([
                { name: 'Hot', bg_color: '#670005', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 1 },
                { name: 'New', bg_color: '#014207', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 2 },
                { name: 'Original', bg_color: '#292929', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 3 },
                { name: 'Premium', bg_color: '#d4af37', text_color: '#000000', border_gradient: 'linear-gradient(to bottom, #FFD700, #DAA520)', sort_order: 4 }
            ]);
            console.log('Seeded Badges');
        } else {
            console.log('Badges already seeded');
        }

        // Seed Vendors
        const vendorCount = await Vendor.count();
        if (vendorCount === 0) {
            await Vendor.bulkCreate([
                { name: 'Vendor A' },
                { name: 'Vendor B' },
                { name: 'Vendor C' },
                { name: 'Vendor D' }
            ]);
            console.log('Seeded Vendors');
        } else {
            console.log('Vendors already seeded');
        }

        console.log('All seeding completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
};

seedMasterData();
