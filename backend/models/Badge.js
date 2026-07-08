const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Badge = sequelize.define('Badge', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bg_color: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '#000000'
    },
    text_color: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '#FFFFFF'
    },
    border_gradient: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'badges',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Badge;
