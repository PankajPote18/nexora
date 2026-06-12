const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

// All admin routes require login AND admin role
router.use(authMiddleware);
router.use(authorizeRoles('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardData);

// Users
router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', adminController.deleteUser);

// Movies and CMS CRUDs are now handled generically in their own routes
// but could be restricted using middleware in app.js instead.
// To keep compatibility, we expose the basic admin endpoints here

module.exports = router;
