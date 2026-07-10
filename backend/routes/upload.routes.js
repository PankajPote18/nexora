const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

// Requires admin privileges to upload files
// router.use(authMiddleware);
// router.use(authorizeRoles('admin'));

router.post('/', upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), (req, res) => {
    try {
        const filePaths = {};
        if (req.files.audio) filePaths.audio = req.files.audio[0].path.replace(/\\/g, '/');
        if (req.files.thumbnail) filePaths.thumbnail = req.files.thumbnail[0].path.replace(/\\/g, '/');
        if (req.files.banner) filePaths.banner = req.files.banner[0].path.replace(/\\/g, '/');

        res.json({ message: 'Files uploaded successfully', files: filePaths });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error during file upload' });
    }
});

module.exports = router;
