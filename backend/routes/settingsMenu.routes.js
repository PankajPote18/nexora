const express = require('express');
const router = express.Router();
const settingsMenuController = require('../controllers/settingsMenu.controller');
const cacheControl = require('../middleware/cacheControl.middleware');
const { cacheMiddleware, invalidateMiddleware } = require('../utils/cache.util');

const CACHE_PREFIX = '/api/settings-menu';

router.get('/', cacheControl(), cacheMiddleware(), settingsMenuController.getAll);
router.get('/:id', cacheControl(), cacheMiddleware(), settingsMenuController.getOne);
router.post('/', invalidateMiddleware(CACHE_PREFIX), settingsMenuController.create);
router.put('/:id', invalidateMiddleware(CACHE_PREFIX), settingsMenuController.update);
router.delete('/:id', invalidateMiddleware(CACHE_PREFIX), settingsMenuController.remove);
router.patch('/reorder', invalidateMiddleware(CACHE_PREFIX), settingsMenuController.reorder);

module.exports = router;
