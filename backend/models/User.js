const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        // A fixed name (instead of `unique: true`) so sync({ alter: true })
        // matches this to the existing DB index by name on every server
        // boot rather than concluding it's missing and adding another one.
        // Without this, every restart adds a new duplicate unique index —
        // MySQL allows at most 64 keys per table, and this table hit that
        // ceiling in production after enough restarts (fixed 2026-07-27).
        unique: 'users_email_unique'
    },
    email_verified_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    remember_token: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user' // assuming 'user', 'admin'
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = User;
