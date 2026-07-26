const express = require('express');
const router = express.Router();
const trayController = require('../controllers/tray.controller');
const authMiddleware = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');
const cacheControl = require('../middleware/cacheControl.middleware');

// Public route to fetch all trays
router.get('/', cacheControl(), trayController.getAll);

// All routes open for now to match other endpoints
router.get('/:id', cacheControl(), trayController.getOne);
router.post('/', trayController.create);
router.put('/:id', trayController.update);
router.delete('/:id', trayController.remove);

module.exports = router;
