const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');

router.get('/', movieController.getAll);
router.get('/:id', movieController.getOne);
router.post('/', movieController.create);
router.put('/:id', movieController.update);
router.delete('/:id', movieController.remove);

module.exports = router;
