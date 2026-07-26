const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const cacheControl = require('../middleware/cacheControl.middleware');

router.get('/', cacheControl(), categoryController.getAll);
router.get('/:id', cacheControl(), categoryController.getOne);
router.post('/', categoryController.create);
router.put('/:id', categoryController.update);
router.delete('/:id', categoryController.remove);

module.exports = router;
