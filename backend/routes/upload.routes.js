const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');

// Every media type — banner/poster/thumbnail/subtitle/movie/trailer — streams
// through this single endpoint straight to Bunny Storage (see
// upload.middleware.js). The backend never buffers a full file or writes it
// to local disk, regardless of size.
const UPLOAD_FIELDS = [
    { name: 'banner', maxCount: 1 },
    { name: 'poster', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'subtitle', maxCount: 1 },
    { name: 'movie', maxCount: 1 },
    { name: 'trailer', maxCount: 1 },
];

router.post('/', upload.fields(UPLOAD_FIELDS), async (req, res) => {
    try {
        const files = {};
        for (const field of UPLOAD_FIELDS) {
            const file = req.files?.[field.name]?.[0];
            if (!file) continue;
            files[field.name] = file.bunnyUrl;
        }

        if (Object.keys(files).length === 0) {
            return res.status(400).json({ message: 'No files were uploaded' });
        }

        res.json({ message: 'Files uploaded successfully', files });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error during file upload', error: error.message });
    }
});

// Errors thrown from BunnyStorageEngine._handleFile (size/type validation,
// Bunny Storage failures) land here instead of the generic app.js error
// handler, so the admin sees a specific, actionable message.
router.use((err, req, res, next) => {
    if (err) {
        return res.status(400).json({ message: err.message || 'Upload failed validation' });
    }
    next();
});

module.exports = router;
