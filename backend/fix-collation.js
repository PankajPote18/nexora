const { sequelize } = require('./config/db.config');

sequelize.authenticate().then(async () => {
    try {
        await sequelize.query('ALTER TABLE hero_banners CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
        await sequelize.query('ALTER TABLE movies CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
        console.log('Collation fixed');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
});
