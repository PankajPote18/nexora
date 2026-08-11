const { SubscriptionPlan, SettingsMenu, SettingsPage, HeroBanner } = require('./models');
const { sequelize } = require('./config/db.config');

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        // Clear existing to avoid duplicates if re-run
        await SubscriptionPlan.destroy({ where: {} });
        await SettingsMenu.destroy({ where: {} });
        await SettingsPage.destroy({ where: {} });

        // Seed Subscription Plans
        const plans = [
            { name: 'Weekly', original_price: 79, billing_cycle: 'WEEKLY', number_of_days: 7, sort_order: 1, is_recommended: false },
            { name: 'Monthly', original_price: 129, billing_cycle: 'MONTHLY', number_of_days: 30, sort_order: 2, is_recommended: true },
            { name: 'Yearly', original_price: 499, billing_cycle: 'YEARLY', number_of_days: 365, sort_order: 3, is_recommended: false }
        ];
        await SubscriptionPlan.bulkCreate(plans);
        console.log('Subscription Plans seeded.');

        // Seed Settings Pages
        const pages = [
            { title: 'Terms of Service', slug: 'terms-of-service', short_description: 'Read our terms.', full_content: '<h2>Terms of Service</h2><p>Here are our terms of service...</p>' },
            { title: 'Privacy Policy', slug: 'privacy-policy', short_description: 'How we handle your data.', full_content: '<h2>Privacy Policy</h2><p>Your privacy is important to us...</p>' },
            { title: 'About Us', slug: 'about-us', short_description: 'Learn about ClickBuz.', full_content: '<h2>About Us</h2><p>ClickBuz is a premium OTT platform...</p>' },
            { title: 'Help Center', slug: 'help-center', short_description: 'Get support here.', full_content: '<h2>Help Center</h2><p>Contact our support team...</p>' }
        ];
        await SettingsPage.bulkCreate(pages);
        console.log('Settings Pages seeded.');

        // Seed Settings Menus
        const menus = [
            { name: 'Account Settings', icon_key: 'User', path: '/settings/account', sort_order: 1, is_highlight: false },
            { name: 'Subscription', icon_key: 'CreditCard', path: '/settings/subscription', sort_order: 2, is_highlight: true },
            { name: 'Viewing History', icon_key: 'History', path: '/settings/history', sort_order: 3, is_highlight: false },
            { name: 'Help & Support', icon_key: 'HelpCircle', path: '/settings/support', sort_order: 4, is_highlight: false },
            { name: 'Sign Out', icon_key: 'LogOut', path: '/logout', sort_order: 5, is_highlight: false, is_logout: true }
        ];
        await SettingsMenu.bulkCreate(menus);
        console.log('Settings Menus seeded.');

        // Seed additional Hero Banners
        const extraBanners = [
            { id: 'hb5', show_id: 'm16', title: 'Titanic', image: 'https://images.unsplash.com/photo-1604085572504-a392ddf0d86a?w=1920&auto=format', status: true, sorting_position: 5 },
            { id: 'hb6', show_id: 'm9', title: 'Fight Club', image: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=1920&auto=format', status: false, sorting_position: 6 },
        ];
        // Using upsert/ignore or just simple create for extra banners.
        try {
            await HeroBanner.bulkCreate(extraBanners, { ignoreDuplicates: true });
            console.log('Extra Hero Banners seeded.');
        } catch {
            console.log('Extra Hero Banners already exist or failed.');
        }

        console.log('Successfully seeded Remaining Data!');
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
};

run();
