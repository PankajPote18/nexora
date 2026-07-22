const multer = require('multer');
const { PassThrough } = require('stream');
const { isExtensionAllowed, isMimeAllowed, getMaxUploadBytes, getMaxUploadMb } = require('../utils/uploadLimits.util');
const { uploadStreamToBunny, buildFilename, FOLDERS } = require('../utils/bunnyStorage.util');

// Custom multer storage engine — every field (banner/poster/thumbnail/
// subtitle/movie/trailer) is piped directly from the incoming request into
// an outgoing Bunny Storage PUT as bytes arrive. Nothing is ever buffered in
// full or written to local disk, so this is safe for a 20GB movie file the
// same way it's safe for a 200KB poster — memory use stays bounded to
// whatever the stream's internal buffer holds at any instant, not the whole
// file.
class BunnyStorageEngine {
    _handleFile(req, file, cb) {
        const field = file.fieldname;

        if (!FOLDERS[field]) {
            file.stream.resume(); // drain the socket so the request doesn't hang
            return cb(new Error(`Unsupported upload field "${field}"`));
        }
        if (!isMimeAllowed(field, file.mimetype)) {
            file.stream.resume();
            return cb(new Error(`Invalid file type for "${field}".`));
        }
        if (!isExtensionAllowed(field, file.originalname)) {
            file.stream.resume();
            return cb(new Error(`Invalid file extension for "${field}".`));
        }

        const maxBytes = getMaxUploadBytes(field);
        const filename = buildFilename(file.originalname);
        const limited = new PassThrough();

        let bytesReceived = 0;
        let limitError = null;

        file.stream.on('data', (chunk) => {
            bytesReceived += chunk.length;
            if (bytesReceived > maxBytes && !limitError) {
                limitError = new Error(`"${field}" file is too large. Maximum allowed is ${getMaxUploadMb(field)}MB.`);
                limited.destroy(limitError);
            }
        });
        file.stream.on('error', (err) => limited.destroy(err));
        file.stream.pipe(limited);

        uploadStreamToBunny(field, filename, limited, file.mimetype)
            .then((bunnyUrl) => cb(null, { bunnyUrl }))
            .catch((err) => cb(limitError || err));
    }

    _removeFile(req, file, cb) {
        // Nothing local to clean up — the file was streamed directly to Bunny
        // Storage and never touched this server's disk or memory in full.
        cb(null);
    }
}

const upload = multer({ storage: new BunnyStorageEngine() });

module.exports = upload;
