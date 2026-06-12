const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const CmsPage = sequelize.define('CmsPage', {
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
        unique: true
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false
    }
}, {
    tableName: 'cms_pages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = CmsPage;
