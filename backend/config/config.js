// sequelize-cli config — mirrors the same connection logic as db.config.js
// (DATABASE_URL takes precedence over discrete DB_* vars) so migrations run
// against the exact same database the app itself connects to. This project
// has only one real database (the Railway MySQL instance in backend/.env);
// there's no separate per-NODE_ENV database, so all three blocks resolve the
// same way.
require('dotenv').config();

const sslOptions = process.env.DB_SSL === 'true'
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {};

const base = process.env.DATABASE_URL
    ? {
        use_env_variable: 'DATABASE_URL',
        dialect: 'mysql',
        dialectOptions: sslOptions,
        logging: false,
    }
    : {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        dialectOptions: sslOptions,
        logging: false,
    };

module.exports = {
    development: base,
    test: base,
    production: base,
};
