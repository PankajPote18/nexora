const express = require('express');
const router = express.Router();
const settingsPageController = require('../controllers/settingsPage.controller');
const cacheControl = require('../middleware/cacheControl.middleware');

router.get('/', cacheControl(), settingsPageController.getAll);
router.get('/:id', cacheControl(), settingsPageController.getOne);
router.get('/slug/:slug', cacheControl(), settingsPageController.getBySlug);
router.post('/', settingsPageController.create);
router.put('/:id', settingsPageController.update);
router.delete('/:id', settingsPageController.remove);

module.exports = router;
