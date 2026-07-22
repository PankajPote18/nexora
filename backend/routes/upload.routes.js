const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const { uploadFilesToVps } = require('../utils/mediaStorage.util');
const { getMaxUploadBytes, getMaxUploadMb } = require('../utils/uploadLimits.util');

// Small, bounded files only (banner/poster/thumbnail/subtitle — all a few MB at
// most). movie/trailer are handled by the separate tus resumable upload flow
// (see mediaUpload.routes.js) so they never pass through this Express route.
const UPLOAD_FIELDS = [
    { name: 'banner', maxCount: 1 },
    { name: 'poster', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'subtitle', maxCount: 1 },
];

router.post('/', upload.fields(UPLOAD_FIELDS), async (req, res) => {
    try {
        const incoming = [];
        for (const field of UPLOAD_FIELDS) {
            const file = req.files?.[field.name]?.[0];
            if (!file) continue;

            const maxBytes = getMaxUploadBytes(field.name);
            if (file.size > maxBytes) {
                return res.status(413).json({
                    message: `"${field.name}" file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is ${getMaxUploadMb(field.name)}MB.`,
                });
            }

            incoming.push({ fieldname: field.name, buffer: file.buffer, originalname: file.originalname });
        }

        if (incoming.length === 0) {
            return res.status(400).json({ message: 'No files were uploaded' });
        }

        const files = await uploadFilesToVps(incoming);

        res.json({ message: 'Files uploaded successfully', files });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error during file upload', error: error.message });
    }
});

// Multer errors (e.g. LIMIT_FILE_SIZE from the global cap, or fileFilter
// rejections) land here instead of the generic app.js error handler, so the
// admin sees a specific, actionable message rather than "Internal Server Error".
router.use((err, req, res, next) => {
    if (err) {
        return res.status(400).json({ message: err.message || 'Upload failed validation' });
    }
    next();
});

module.exports = router;
