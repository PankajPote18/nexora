const { sequelize } = require('./config/db.config');

sequelize.authenticate().then(async () => {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS trays (
                id CHAR(36) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                sorting_position INT NOT NULL,
                shows JSON DEFAULT NULL,
                shape VARCHAR(255) NOT NULL DEFAULT 'rectangle',
                aspect_ratio VARCHAR(255) NOT NULL DEFAULT '16:9',
                status TINYINT(1) DEFAULT 1,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('Table trays created successfully!');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
});
