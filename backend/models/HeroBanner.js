const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const HeroBanner = sequelize.define('HeroBanner', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    show_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sorting_position: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'hero_banners',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = HeroBanner;
