const express = require('express');
const router = express.Router();
const mediaUploadController = require('../controllers/mediaUpload.controller');
const authMiddleware = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

// Requires a real, logged-in admin session (see src/pages/admin/AdminLogin.jsx) —
// unlike the rest of this codebase's admin endpoints, this one is genuinely
// auth-gated, since it mints a credential capable of writing a large file to
// the VPS media server.
router.post('/authorize', authMiddleware, authorizeRoles('admin'), mediaUploadController.authorizeUpload);

// Machine-to-machine callback from the VPS tus service — authenticated via a
// shared secret header, not an admin session (see controller).
router.post('/webhook', mediaUploadController.uploadWebhook);

module.exports = router;
