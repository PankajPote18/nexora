const express = require('express');
const router = express.Router();
const settingsMenuController = require('../controllers/settingsMenu.controller');
const cacheControl = require('../middleware/cacheControl.middleware');

router.get('/', cacheControl(), settingsMenuController.getAll);
router.get('/:id', cacheControl(), settingsMenuController.getOne);
router.post('/', settingsMenuController.create);
router.put('/:id', settingsMenuController.update);
router.delete('/:id', settingsMenuController.remove);
router.patch('/reorder', settingsMenuController.reorder);

module.exports = router;
