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
const Tray = require('./Tray');
const Payment = require('./Payment');

// Define Relationships here if needed in the future
HeroBanner.belongsTo(Movie, { foreignKey: 'show_id', as: 'show' });
Movie.hasMany(HeroBanner, { foreignKey: 'show_id' });

Payment.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });
SubscriptionPlan.hasMany(Payment, { foreignKey: 'plan_id' });
Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Payment, { foreignKey: 'user_id' });

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
    HeroBanner,
    Tray,
    Payment
};
