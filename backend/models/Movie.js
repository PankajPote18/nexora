const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Movie = sequelize.define('Movie', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    posterUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    backdropUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    videoUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    trailerUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    subtitleUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rating: {
        type: DataTypes.DECIMAL(3,1),
        allowNull: true
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    duration: {
        type: DataTypes.STRING,
        allowNull: true
    },
    genres: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('genres');
            try {
                return rawValue ? JSON.parse(rawValue) : [];
            } catch {
                return rawValue ? rawValue.split(',') : [];
            }
        }
    },
    cast: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isNew: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isTrending: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isOriginal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    ageRating: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'movies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Movie;
