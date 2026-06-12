const express = require('express');
const router = express.Router();
const settingsPageController = require('../controllers/settingsPage.controller');

router.get('/', settingsPageController.getAll);
router.get('/:id', settingsPageController.getOne);
router.get('/slug/:slug', settingsPageController.getBySlug);
router.post('/', settingsPageController.create);
router.put('/:id', settingsPageController.update);
router.delete('/:id', settingsPageController.remove);

module.exports = router;
