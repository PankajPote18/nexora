const express = require('express');
const router = express.Router();
const siteSettingController = require('../controllers/siteSetting.controller');
const cacheControl = require('../middleware/cacheControl.middleware');
const { cacheMiddleware, invalidateMiddleware } = require('../utils/cache.util');

const CACHE_PREFIX = '/api/site-settings';

router.get('/', cacheControl(), cacheMiddleware(), siteSettingController.getAll);
router.put('/', invalidateMiddleware(CACHE_PREFIX), siteSettingController.update);

module.exports = router;
