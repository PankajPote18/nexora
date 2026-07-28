const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const cacheControl = require('../middleware/cacheControl.middleware');
const { cacheMiddleware, invalidateMiddleware } = require('../utils/cache.util');

const CACHE_PREFIX = '/api/categories';

router.get('/', cacheControl(), cacheMiddleware(), categoryController.getAll);
router.get('/:id', cacheControl(), cacheMiddleware(), categoryController.getOne);
router.post('/', invalidateMiddleware(CACHE_PREFIX), categoryController.create);
router.put('/:id', invalidateMiddleware(CACHE_PREFIX), categoryController.update);
router.delete('/:id', invalidateMiddleware(CACHE_PREFIX), categoryController.remove);

module.exports = router;
