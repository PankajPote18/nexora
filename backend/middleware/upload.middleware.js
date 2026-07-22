const multer = require('multer');
const { isExtensionAllowed, isMimeAllowed, getMaxUploadBytes } = require('../utils/uploadLimits.util');

// Only banner/poster/thumbnail/subtitle come through this path — all capped at
// a few MB, so buffering in memory before pushing to the VPS over SFTP is safe.
// movie/trailer (up to 20GB / 2GB) never touch this middleware: they upload
// directly to the VPS via the tus resumable protocol (see routes/mediaUpload.routes.js),
// so the backend never buffers or proxies large video bytes.
const storage = multer.memoryStorage();

const SMALL_FILE_FIELDS = ['banner', 'poster', 'thumbnail', 'subtitle'];

const fileFilter = (req, file, cb) => {
    const field = file.fieldname;

    if (!SMALL_FILE_FIELDS.includes(field)) {
        return cb(new Error(`Unsupported upload field "${field}"`), false);
    }

    if (!isMimeAllowed(field, file.mimetype)) {
        return cb(new Error(`Invalid file type for "${field}" — expected a ${field === 'subtitle' ? 'subtitle' : 'image'} file.`), false);
    }

    if (!isExtensionAllowed(field, file.originalname)) {
        return cb(new Error(`Invalid file extension for "${field}".`), false);
    }

    cb(null, true);
};

// multer's fileSize limit is a single global cap for the whole instance (it can't
// vary per field), so it's set to the largest of the small-file limits here as a
// fast first gate; upload.routes.js re-checks the actual per-field limit against
// the fully-buffered file for an accurate, field-specific error message.
const GLOBAL_MAX_BYTES = Math.max(
    ...SMALL_FILE_FIELDS.map((field) => getMaxUploadBytes(field))
);

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: GLOBAL_MAX_BYTES,
    },
});

module.exports = upload;
