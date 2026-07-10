const express = require('express');
const router = express.Router();
const trayController = require('../controllers/tray.controller');
const authMiddleware = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

// Public route to fetch all trays
router.get('/', trayController.getAll);

// Protected routes
router.use(authMiddleware);
router.use(authorizeRoles('admin'));

router.get('/:id', trayController.getOne);
router.post('/', trayController.create);
router.put('/:id', trayController.update);
router.delete('/:id', trayController.remove);

module.exports = router;
