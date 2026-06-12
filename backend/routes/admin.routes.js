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

// Audio
router.post('/audio', adminController.createAudio);
router.delete('/audio/:id', adminController.deleteAudio);

// CMS
router.put('/cms/:id', adminController.updateCmsPage);

module.exports = router;
