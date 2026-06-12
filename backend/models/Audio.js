const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Audio = sequelize.define('Audio', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    thumbnail: {
        type: DataTypes.STRING,
        allowNull: true
    },
    banner: {
        type: DataTypes.STRING,
        allowNull: true
    },
    audio_file: {
        type: DataTypes.STRING,
        allowNull: false
    },
    duration: {
        type: DataTypes.INTEGER, // duration in seconds
        allowNull: true
    },
    play_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    category_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    is_trending: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'audio_contents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Audio;
