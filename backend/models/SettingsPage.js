const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const SettingsPage = sequelize.define('SettingsPage', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        // Fixed name so sync({ alter: true }) matches the existing DB index
        // by name on every boot instead of adding a new duplicate one each
        // time — see backend/models/User.js for the full explanation.
        unique: 'settings_pages_slug_unique'
    },
    short_description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    full_content: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'settings_pages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SettingsPage;
