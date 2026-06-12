const { sequelize } = require('../config/db.config');
const User = require('./User');
const Audio = require('./Audio');
const Subscription = require('./Subscription');
const CmsPage = require('./CmsPage');

// Define Relationships

// User & Subscription (1 to Many or 1 to 1 depending on logic)
User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// We could add User Favorites for Audio, etc., if there's a pivot table
// User.belongsToMany(Audio, { through: 'user_favorites', foreignKey: 'user_id' });
// Audio.belongsToMany(User, { through: 'user_favorites', foreignKey: 'audio_id' });

module.exports = {
    sequelize,
    User,
    Audio,
    Subscription,
    CmsPage
};
