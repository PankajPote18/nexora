const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const cacheControl = require('../middleware/cacheControl.middleware');
const { cacheMiddleware, invalidateMiddleware } = require('../utils/cache.util');

const CACHE_PREFIX = '/api/movies';

router.get('/', cacheControl(), cacheMiddleware(), movieController.getAll);
router.get('/:id', cacheControl(), cacheMiddleware(), movieController.getOne);
router.post('/', invalidateMiddleware(CACHE_PREFIX), movieController.create);
router.put('/:id', invalidateMiddleware(CACHE_PREFIX), movieController.update);
router.delete('/:id', invalidateMiddleware(CACHE_PREFIX), movieController.remove);

module.exports = router;
