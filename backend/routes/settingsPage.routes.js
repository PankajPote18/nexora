const express = require('express');
const router = express.Router();
const settingsPageController = require('../controllers/settingsPage.controller');
const cacheControl = require('../middleware/cacheControl.middleware');
const { cacheMiddleware, invalidateMiddleware } = require('../utils/cache.util');

const CACHE_PREFIX = '/api/settings-pages';

router.get('/', cacheControl(), cacheMiddleware(), settingsPageController.getAll);
router.get('/:id', cacheControl(), cacheMiddleware(), settingsPageController.getOne);
router.get('/slug/:slug', cacheControl(), cacheMiddleware(), settingsPageController.getBySlug);
router.post('/', invalidateMiddleware(CACHE_PREFIX), settingsPageController.create);
router.put('/:id', invalidateMiddleware(CACHE_PREFIX), settingsPageController.update);
router.delete('/:id', invalidateMiddleware(CACHE_PREFIX), settingsPageController.remove);

module.exports = router;
