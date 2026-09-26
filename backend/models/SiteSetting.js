const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

// Small key/value store for page-level settings managed from the admin panel
// (e.g. the Explore Plans background images). Which keys may be written is
// whitelisted in controllers/siteSetting.controller.js.
const SiteSetting = sequelize.define('SiteSetting', {
    key: {
        type: DataTypes.STRING(100),
        primaryKey: true
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'site_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SiteSetting;
