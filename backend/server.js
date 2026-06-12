require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./config/db.config');

const PORT = process.env.PORT || 5000;

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
