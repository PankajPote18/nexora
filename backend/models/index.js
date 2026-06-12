const { sequelize } = require('../config/db.config');
const User = require('./User');
const Movie = require('./Movie');
const SubscriptionPlan = require('./SubscriptionPlan');
const SettingsPage = require('./SettingsPage');
const SettingsMenu = require('./SettingsMenu');
const Category = require('./Category');

// Define Relationships here if needed in the future

module.exports = {
    sequelize,
    User,
    Movie,
    SubscriptionPlan,
    SettingsPage,
    SettingsMenu,
    Category
};
