require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Server } = require('@tus/server');
const { FileStore } = require('@tus/file-store');

const PORT = process.env.PORT || 1080;
const MEDIA_ROOT = process.env.MEDIA_ROOT || '/srv/clickbuz-media';
const TEMP_DIR = path.join(MEDIA_ROOT, 'temp');
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || '').replace(/\/$/, '');
const RENDER_WEBHOOK_URL = process.env.RENDER_WEBHOOK_URL || '';
const TUS_WEBHOOK_SECRET = process.env.TUS_WEBHOOK_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRATION_HOURS = Number(process.env.UPLOAD_EXPIRATION_HOURS) || 24;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);

if (!JWT_SECRET) {
    console.error('JWT_SECRET is required (must match the Render backend\'s JWT_SECRET).');
    process.exit(1);
}

// Independent, VPS-side ceiling — enforced even if a bug on Render ever issued
// a token with a larger claimed limit than policy actually allows.
const MAX_BYTES = {
    movie: (Number(process.env.MAX_UPLOAD_MB_MOVIE) || 20480) * 1024 * 1024,
    trailer: (Number(process.env.MAX_UPLOAD_MB_TRAILER) || 2048) * 1024 * 1024,
};

const ALLOWED_EXTENSIONS = {
    movie: ['.mp4', '.mov', '.mkv', '.webm', '.avi'],
    trailer: ['.mp4', '.mov', '.mkv', '.webm', '.avi'],
};

const FOLDERS = {
    movie: 'movies',
    trailer: 'trailers',
};

fs.mkdirSync(TEMP_DIR, { recursive: true });
for (const folder of Object.values(FOLDERS)) {
    fs.mkdirSync(path.join(MEDIA_ROOT, folder), { recursive: true });
}

const sanitizeBaseName = (originalname) => {
    const base = path.basename(originalname, path.extname(originalname));
    return base.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
};

const buildFinalFilename = (originalname) => {
    const ext = path.extname(originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    return `${uniqueSuffix}-${sanitizeBaseName(originalname)}${ext}`;
};

const notifyRenderWebhook = async (payload) => {
    if (!RENDER_WEBHOOK_URL) return;
    try {
        await fetch(RENDER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': TUS_WEBHOOK_SECRET },
            body: JSON.stringify(payload),
        });
    } catch (err) {
        // Non-fatal — the frontend already gets the final URL directly via the
        // Upload-Info response header, this webhook is an audit trail only.
        console.error('Failed to notify Render webhook:', err.message);
    }
};

const datastore = new FileStore({
    directory: TEMP_DIR,
    expirationPeriodInMilliseconds: EXPIRATION_HOURS * 60 * 60 * 1000,
});

const tusServer = new Server({
    path: '/files',
    datastore,
    allowedOrigins: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : undefined,
    allowedHeaders: ['Authorization', 'Content-Type', 'Tus-Resumable', 'Upload-Length', 'Upload-Metadata', 'Upload-Offset', 'X-Requested-With'],

    // Runs on every tus request for this upload's lifetime (create, every
    // chunk PATCH, HEAD, DELETE) — not just once at creation.
    onIncomingRequest: async (req) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw { status_code: 401, body: 'Missing upload authorization token\n' };
        }

        let payload;
        try {
            payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
        } catch (err) {
            throw { status_code: 401, body: 'Invalid or expired upload authorization token\n' };
        }

        if (payload.purpose !== 'tus-upload' || !FOLDERS[payload.fieldType]) {
            throw { status_code: 403, body: 'Token is not valid for this upload type\n' };
        }

        req.uploadAuth = payload;
    },

    // Runs once, when the upload resource is first created — cross-checks the
    // declared metadata/size against what the token actually authorizes.
    onUploadCreate: async (req, upload) => {
        const auth = req.uploadAuth;
        const metadata = upload.metadata || {};

        if (metadata.uploadId !== auth.uploadId) {
            throw { status_code: 403, body: 'Upload metadata does not match the authorization token\n' };
        }
        if (metadata.fieldType !== auth.fieldType) {
            throw { status_code: 403, body: 'fieldType does not match the authorization token\n' };
        }

        const maxBytes = Math.min(auth.maxSize || Infinity, MAX_BYTES[auth.fieldType]);
        if (upload.size && upload.size > maxBytes) {
            throw { status_code: 413, body: `File exceeds the ${(maxBytes / (1024 * 1024 * 1024)).toFixed(2)}GB limit for "${auth.fieldType}"\n` };
        }

        const filename = metadata.filename || '';
        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS[auth.fieldType].includes(ext)) {
            throw { status_code: 400, body: `Invalid file extension for "${auth.fieldType}"\n` };
        }

        return {};
    },

    // Runs once, when the last byte has been received — moves the finished
    // file out of temp/ into its real folder and hands the final URL back.
    onUploadFinish: async (req, upload) => {
        const auth = req.uploadAuth;
        const metadata = upload.metadata || {};
        const folder = FOLDERS[auth.fieldType];

        const tempPath = path.join(TEMP_DIR, upload.id);
        const finalFilename = buildFinalFilename(metadata.filename || 'upload.bin');
        const finalPath = path.join(MEDIA_ROOT, folder, finalFilename);

        await fs.promises.rename(tempPath, finalPath);
        // Best-effort cleanup of the file-store's metadata sidecar; harmless if absent/renamed differently.
        fs.promises.unlink(`${tempPath}.json`).catch(() => {});

        const finalUrl = `${MEDIA_BASE_URL}/${folder}/${finalFilename}`;

        notifyRenderWebhook({
            uploadId: auth.uploadId,
            fieldType: auth.fieldType,
            movieId: auth.movieId,
            url: finalUrl,
            size: upload.size,
        });

        return {
            status_code: 200,
            headers: {
                'Upload-Info': JSON.stringify({ url: finalUrl, fieldType: auth.fieldType, size: upload.size }),
            },
        };
    },
});

const app = express();

app.all('/files', (req, res) => tusServer.handle(req, res));
app.all('/files/*', (req, res) => tusServer.handle(req, res));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '127.0.0.1', () => {
    console.log(`ClickBuz tus upload service listening on 127.0.0.1:${PORT}`);
});

// Sweep incomplete uploads left in temp/ past their expiration window hourly.
setInterval(async () => {
    try {
        const deleted = await tusServer.cleanUpExpiredUploads();
        if (deleted) console.log(`Cleaned up ${deleted} expired/abandoned upload(s).`);
    } catch (err) {
        console.error('Expired-upload cleanup failed:', err.message);
    }
}, 60 * 60 * 1000);
