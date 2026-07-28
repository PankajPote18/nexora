const express = require('express');
const router = express.Router();
const heroBannerController = require('../controllers/heroBanner.controller');
const cacheControl = require('../middleware/cacheControl.middleware');
const { cacheMiddleware, invalidateMiddleware } = require('../utils/cache.util');

const CACHE_PREFIX = '/api/hero-banners';

router.get('/', cacheControl(), cacheMiddleware(), heroBannerController.getAll);
router.post('/', invalidateMiddleware(CACHE_PREFIX), heroBannerController.create);
router.put('/:id', invalidateMiddleware(CACHE_PREFIX), heroBannerController.update);
router.delete('/:id', invalidateMiddleware(CACHE_PREFIX), heroBannerController.remove);

module.exports = router;
