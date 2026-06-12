const express = require('express');
const router = express.Router();
const subscriptionPlanController = require('../controllers/subscriptionPlan.controller');

router.get('/', subscriptionPlanController.getAll);
router.get('/:id', subscriptionPlanController.getOne);
router.post('/', subscriptionPlanController.create);
router.put('/:id', subscriptionPlanController.update);
router.delete('/:id', subscriptionPlanController.remove);
router.patch('/:id/toggle', subscriptionPlanController.toggle);

module.exports = router;
