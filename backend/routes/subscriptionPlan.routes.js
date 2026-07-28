const express = require('express');
const router = express.Router();
const subscriptionPlanController = require('../controllers/subscriptionPlan.controller');
const cacheControl = require('../middleware/cacheControl.middleware');
const { cacheMiddleware, invalidateMiddleware } = require('../utils/cache.util');

const CACHE_PREFIX = '/api/subscription-plans';

router.get('/', cacheControl(), cacheMiddleware(), subscriptionPlanController.getAll);
router.get('/:id', cacheControl(), cacheMiddleware(), subscriptionPlanController.getOne);
router.post('/', invalidateMiddleware(CACHE_PREFIX), subscriptionPlanController.create);
router.put('/:id', invalidateMiddleware(CACHE_PREFIX), subscriptionPlanController.update);
router.delete('/:id', invalidateMiddleware(CACHE_PREFIX), subscriptionPlanController.remove);
router.patch('/:id/toggle', invalidateMiddleware(CACHE_PREFIX), subscriptionPlanController.toggle);

module.exports = router;
