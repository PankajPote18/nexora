const express = require('express');
const router = express.Router();
const audioController = require('../controllers/audio.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public routes (if applicable, adjust based on your needs)
router.get('/', audioController.listAudio);
router.get('/trending', audioController.getTrendingAudio);
router.get('/:id', audioController.getAudioDetails);

// Protected routes (require login)
router.use(authMiddleware);
router.post('/:id/play', audioController.incrementPlayCount);

module.exports = router;
