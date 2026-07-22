// Shared upload policy — used by upload.middleware.js's BunnyStorageEngine for
// every media field (banner/poster/thumbnail/subtitle/movie/trailer). All size
// limits are environment-configurable; nothing here is a hardcoded ceiling the
// operator can't change without a code edit.

const DEFAULT_LIMITS_MB = {
    banner: 10,
    poster: 10,
    thumbnail: 10,
    subtitle: 5,
    movie: 20480,   // 20GB
    trailer: 2048,  // 2GB
};

const getMaxUploadBytes = (fieldType) => {
    const envKey = `MAX_UPLOAD_MB_${fieldType.toUpperCase()}`;
    const configuredMb = Number(process.env[envKey]) || DEFAULT_LIMITS_MB[fieldType];
    return configuredMb * 1024 * 1024;
};

const getMaxUploadMb = (fieldType) => getMaxUploadBytes(fieldType) / (1024 * 1024);

// fieldType -> allowed extensions (lowercase, with leading dot)
const ALLOWED_EXTENSIONS = {
    banner: ['.jpg', '.jpeg', '.png', '.webp'],
    poster: ['.jpg', '.jpeg', '.png', '.webp'],
    thumbnail: ['.jpg', '.jpeg', '.png', '.webp'],
    subtitle: ['.srt', '.vtt', '.sub', '.ass', '.ssa'],
    movie: ['.mp4', '.mov', '.mkv', '.webm', '.avi'],
    trailer: ['.mp4', '.mov', '.mkv', '.webm', '.avi'],
};

// fieldType -> required MIME type prefix ('' means "any", used for subtitles which
// don't have a reliable cross-browser MIME type — extension is the real check there)
const MIME_PREFIX = {
    banner: 'image/',
    poster: 'image/',
    thumbnail: 'image/',
    subtitle: '',
    movie: 'video/',
    trailer: 'video/',
};

const isExtensionAllowed = (fieldType, filename) => {
    const ext = require('path').extname(filename).toLowerCase();
    return (ALLOWED_EXTENSIONS[fieldType] || []).includes(ext);
};

const isMimeAllowed = (fieldType, mimetype) => {
    const prefix = MIME_PREFIX[fieldType];
    if (!prefix) return true; // no MIME constraint for this field (e.g. subtitle)
    return typeof mimetype === 'string' && mimetype.startsWith(prefix);
};

const KNOWN_FIELD_TYPES = Object.keys(DEFAULT_LIMITS_MB);

module.exports = {
    KNOWN_FIELD_TYPES,
    getMaxUploadBytes,
    getMaxUploadMb,
    ALLOWED_EXTENSIONS,
    MIME_PREFIX,
    isExtensionAllowed,
    isMimeAllowed,
};
