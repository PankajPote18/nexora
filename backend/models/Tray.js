const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Tray = sequelize.define('Tray', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    sorting_position: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    shows: {
        type: DataTypes.JSON, // stores array of movie IDs
        allowNull: true,
        defaultValue: []
    },
    shape: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'rectangle' // rectangle, square, trending
    },
    aspect_ratio: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '16:9'
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    }
}, {
    tableName: 'trays',
    timestamps: true,
    underscored: true
});

module.exports = Tray;
