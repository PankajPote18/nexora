const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const cacheControl = require('../middleware/cacheControl.middleware');

router.get('/', cacheControl(), movieController.getAll);
router.get('/:id', cacheControl(), movieController.getOne);
router.post('/', movieController.create);
router.put('/:id', movieController.update);
router.delete('/:id', movieController.remove);

module.exports = router;
