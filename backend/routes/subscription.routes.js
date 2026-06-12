const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/plans', subscriptionController.getPlans);

router.use(authMiddleware);
router.post('/purchase', subscriptionController.purchaseSubscription);

module.exports = router;
