const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cms.controller');

// Public route to get CMS pages
router.get('/:slug', cmsController.getPageBySlug);

module.exports = router;
