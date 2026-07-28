const express = require('express');
const router = express.Router();
const trayController = require('../controllers/tray.controller');
const authMiddleware = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');
const cacheControl = require('../middleware/cacheControl.middleware');
const { cacheMiddleware, invalidateMiddleware } = require('../utils/cache.util');

const CACHE_PREFIX = '/api/trays';

// Public route to fetch all trays
router.get('/', cacheControl(), cacheMiddleware(), trayController.getAll);

// All routes open for now to match other endpoints
router.get('/:id', cacheControl(), cacheMiddleware(), trayController.getOne);
router.post('/', invalidateMiddleware(CACHE_PREFIX), trayController.create);
router.put('/:id', invalidateMiddleware(CACHE_PREFIX), trayController.update);
router.delete('/:id', invalidateMiddleware(CACHE_PREFIX), trayController.remove);

module.exports = router;
