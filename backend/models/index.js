const { sequelize } = require('../config/db.config');
const User = require('./User');
const Movie = require('./Movie');
const SubscriptionPlan = require('./SubscriptionPlan');
const SettingsPage = require('./SettingsPage');
const SettingsMenu = require('./SettingsMenu');
const Category = require('./Category');
const HeroBanner = require('./HeroBanner');

const Genre = require('./Genre');
const Language = require('./Language');
const AgeCertificate = require('./AgeCertificate');
const MatureTheme = require('./MatureTheme');
const Badge = require('./Badge');
const Vendor = require('./Vendor');

// Define Relationships here if needed in the future

module.exports = {
    sequelize,
    User,
    Movie,
    SubscriptionPlan,
    SettingsPage,
    SettingsMenu,
    Category,
    Genre,
    Language,
    AgeCertificate,
    MatureTheme,
    Badge,
    Vendor,
    HeroBanner
};
