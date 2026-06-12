const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createDirIfNotExist = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

createDirIfNotExist('uploads/audio');
createDirIfNotExist('uploads/thumbnails');
createDirIfNotExist('uploads/banners');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'audio') {
            cb(null, 'uploads/audio/');
        } else if (file.fieldname === 'thumbnail') {
            cb(null, 'uploads/thumbnails/');
        } else if (file.fieldname === 'banner') {
            cb(null, 'uploads/banners/');
        } else {
            cb(null, 'uploads/');
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (optional, to restrict extensions)
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'audio' && !file.mimetype.startsWith('audio/')) {
        return cb(new Error('Only audio files are allowed for audio field!'), false);
    }
    if ((file.fieldname === 'thumbnail' || file.fieldname === 'banner') && !file.mimetype.startsWith('image/')) {
        return cb(new Error('Only images are allowed for thumbnails and banners!'), false);
    }
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 50 // 50MB limit
    }
});

module.exports = upload;
