const { SettingsMenu, SettingsPage } = require('./models');
const { sequelize } = require('./config/db.config');

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        // Clear existing Settings Menus and Pages
        await SettingsMenu.destroy({ where: {} });
        await SettingsPage.destroy({ where: {} });
        console.log('Cleared existing Settings Menus and Pages.');

        // Seed Settings Pages
        const pages = [
            { title: 'About', slug: 'about', short_description: 'About our platform.', full_content: '<h2>About Us</h2><p>Welcome to our platform. We provide the best entertainment experience.</p>' },
            { title: 'Privacy Policy', slug: 'privacy-policy', short_description: 'How we handle your data.', full_content: '<h2>Privacy Policy</h2><p>Your privacy is important to us. Here is how we handle your data...</p>' },
            { title: 'Refund Policy', slug: 'refund-policy', short_description: 'Our refund rules.', full_content: '<h2>Refund Policy</h2><p>Here are our rules regarding refunds and cancellations...</p>' },
            { title: 'Terms and Conditions', slug: 'terms-and-conditions', short_description: 'Rules for using our service.', full_content: '<h2>Terms and Conditions</h2><p>By using our service, you agree to the following terms...</p>' }
        ];
        await SettingsPage.bulkCreate(pages);
        console.log('Settings Pages seeded.');

        // Seed Settings Menus based on the screenshot
        const menus = [
            { name: 'Explore Plans', icon_key: 'Zap', path: '/subscription', sort_order: 1, is_highlight: false },
            { name: 'My List', icon_key: 'Bookmark', path: '/my-list', sort_order: 2, is_highlight: false },
            { name: 'About', icon_key: 'Info', path: '/page/about', sort_order: 3, is_highlight: false },
            { name: 'Privacy Policy', icon_key: 'Shield', path: '/page/privacy-policy', sort_order: 4, is_highlight: false },
            { name: 'Refund Policy', icon_key: 'LineChart', path: '/page/refund-policy', sort_order: 5, is_highlight: false },
            { name: 'Terms and Conditions', icon_key: 'FileText', path: '/page/terms-and-conditions', sort_order: 6, is_highlight: false }
        ];
        await SettingsMenu.bulkCreate(menus);
        console.log('Settings Menus seeded.');

        console.log('Successfully seeded the new Settings Data!');
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
};

run();
