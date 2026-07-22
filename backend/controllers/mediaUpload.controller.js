const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Movie } = require('../models');
const { getMaxUploadBytes, isExtensionAllowed, MIME_PREFIX } = require('../utils/uploadLimits.util');

const LARGE_FIELD_TYPES = ['movie', 'trailer'];

// Issues a short-lived, single-purpose JWT scoped to exactly one upload.
// The VPS tus service verifies this same token (shared JWT_SECRET) on every
// request for that upload's lifetime — not just at creation — so a stolen
// token can only ever write one file, to one folder, up to one size limit,
// before it expires.
exports.authorizeUpload = async (req, res) => {
    try {
        const { fieldType, filename, filesize, mimetype, movieId } = req.body;

        if (!LARGE_FIELD_TYPES.includes(fieldType)) {
            return res.status(400).json({ message: `fieldType must be one of: ${LARGE_FIELD_TYPES.join(', ')}` });
        }
        if (!filename || !filesize) {
            return res.status(400).json({ message: 'filename and filesize are required' });
        }

        if (movieId) {
            const movie = await Movie.findByPk(movieId);
            if (!movie) {
                return res.status(404).json({ message: 'Movie not found' });
            }
        }

        const maxBytes = getMaxUploadBytes(fieldType);
        if (Number(filesize) > maxBytes) {
            return res.status(413).json({
                message: `"${fieldType}" file is too large (${(filesize / (1024 * 1024 * 1024)).toFixed(2)}GB). Maximum allowed is ${(maxBytes / (1024 * 1024 * 1024)).toFixed(2)}GB.`,
            });
        }

        if (!isExtensionAllowed(fieldType, filename)) {
            return res.status(400).json({ message: `Invalid file extension for "${fieldType}".` });
        }

        const requiredPrefix = MIME_PREFIX[fieldType];
        if (requiredPrefix && mimetype && !mimetype.startsWith(requiredPrefix)) {
            return res.status(400).json({ message: `Invalid file type for "${fieldType}" — expected a video file.` });
        }

        const uploadId = crypto.randomUUID();
        const expiresIn = process.env.TUS_UPLOAD_TOKEN_EXPIRY || '24h';

        const authToken = jwt.sign(
            {
                uploadId,
                fieldType,
                maxSize: maxBytes,
                movieId: movieId || null,
                purpose: 'tus-upload',
            },
            process.env.JWT_SECRET,
            { expiresIn }
        );

        const tusEndpoint = (process.env.TUS_UPLOAD_ENDPOINT || '').replace(/\/?$/, '/');

        res.json({ uploadId, tusEndpoint, authToken, expiresIn });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error authorizing upload' });
    }
};

// Called by the VPS tus service after a file finishes uploading and is moved
// into its final folder. Authenticated via a shared secret (not an admin JWT —
// this is a machine-to-machine call from the VPS, not a browser request).
exports.uploadWebhook = async (req, res) => {
    try {
        const providedSecret = req.headers['x-webhook-secret'];
        if (!providedSecret || providedSecret !== process.env.TUS_WEBHOOK_SECRET) {
            return res.status(401).json({ message: 'Invalid webhook secret' });
        }

        const { uploadId, fieldType, url, size, movieId } = req.body;
        console.log(`[media-webhook] upload finished: ${fieldType} (${uploadId}) -> ${url} (${size} bytes)${movieId ? `, movieId=${movieId}` : ''}`);

        // Informational only — the frontend already receives the final URL
        // directly from tus-js-client's onSuccess callback and saves it via
        // the normal POST/PUT /api/movies call. This webhook exists as a
        // server-side audit trail and a hook point for future automation
        // (e.g. transcoding) without needing the browser to stay connected.
        res.json({ received: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error processing webhook' });
    }
};
