const express = require('express');
const router = express.Router();
const heroBannerController = require('../controllers/heroBanner.controller');

router.get('/', heroBannerController.getAll);
router.post('/', heroBannerController.create);
router.put('/:id', heroBannerController.update);
router.delete('/:id', heroBannerController.remove);

module.exports = router;
