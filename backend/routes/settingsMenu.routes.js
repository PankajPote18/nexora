const express = require('express');
const router = express.Router();
const settingsMenuController = require('../controllers/settingsMenu.controller');

router.get('/', settingsMenuController.getAll);
router.get('/:id', settingsMenuController.getOne);
router.post('/', settingsMenuController.create);
router.put('/:id', settingsMenuController.update);
router.delete('/:id', settingsMenuController.remove);
router.patch('/reorder', settingsMenuController.reorder);

module.exports = router;
