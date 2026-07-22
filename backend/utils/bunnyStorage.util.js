const crypto = require('crypto');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// Bunny Storage (Edge Storage) — the only media backend in this project.
// Every upload field (banner/poster/thumbnail/subtitle/movie/trailer) streams
// straight from the incoming request into a single outgoing HTTPS PUT to
// Bunny Storage — the file is never buffered in full in memory, never written
// to local disk, and no temp files are created (see upload.middleware.js).
const ZONE = process.env.BUNNY_STORAGE_ZONE;
const REGION = (process.env.BUNNY_STORAGE_REGION || '').trim();
const ACCESS_KEY = process.env.BUNNY_STORAGE_ACCESS_KEY;
const CDN_BASE_URL = (process.env.BUNNY_CDN_BASE_URL || '').replace(/\/$/, '');

// Default (Falkenstein) region has no hostname prefix; regional replication
// zones (ny/la/sg/syd/...) are addressed as `{region}.storage.bunnycdn.com`.
const STORAGE_HOST = REGION ? `${REGION}.storage.bunnycdn.com` : 'storage.bunnycdn.com';

const FOLDERS = {
    banner: 'banners',
    poster: 'posters',
    thumbnail: 'thumbnails',
    subtitle: 'subtitles',
    movie: 'movies',
    trailer: 'trailers',
};

const sanitizeBaseName = (originalname) => {
    const base = path.basename(originalname, path.extname(originalname));
    return base.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
};

const buildFilename = (originalname) => {
    const ext = path.extname(originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    return `${uniqueSuffix}-${sanitizeBaseName(originalname)}${ext}`;
};

// Pipes a live request stream directly into a Bunny Storage PUT request and
// resolves with the file's public Bunny CDN URL. No Content-Length is sent
// (the size isn't known upfront for a streamed body), so Node negotiates
// chunked transfer-encoding automatically — standard HTTP/1.1, which Bunny's
// Storage API accepts.
const uploadStreamToBunny = (fieldname, filename, fileStream, mimetype) => {
    return new Promise((resolve, reject) => {
        if (!ZONE || !ACCESS_KEY || !CDN_BASE_URL) {
            return reject(new Error('Bunny Storage is not configured (BUNNY_STORAGE_ZONE / BUNNY_STORAGE_ACCESS_KEY / BUNNY_CDN_BASE_URL missing)'));
        }

        const folder = FOLDERS[fieldname];
        if (!folder) return reject(new Error(`No Bunny Storage folder configured for field "${fieldname}"`));

        const target = new URL(`https://${STORAGE_HOST}/${ZONE}/${folder}/${filename}`);

        const putReq = https.request(
            {
                hostname: target.hostname,
                path: target.pathname,
                method: 'PUT',
                headers: {
                    AccessKey: ACCESS_KEY,
                    'Content-Type': mimetype || 'application/octet-stream',
                },
            },
            (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(`${CDN_BASE_URL}/${folder}/${filename}`);
                    } else {
                        reject(new Error(`Bunny Storage upload failed for "${fieldname}" (${res.statusCode}): ${body}`));
                    }
                });
            }
        );

        putReq.on('error', reject);
        fileStream.on('error', (err) => {
            putReq.destroy(err);
            reject(err);
        });

        fileStream.pipe(putReq);
    });
};

// Deletes a previously uploaded file given its field type + stored filename
// (not the full CDN URL). Best-effort, not currently wired into any route —
// available for future use (e.g. replacing/removing a movie's poster).
const deleteFileFromBunny = async (fieldname, filename) => {
    const folder = FOLDERS[fieldname];
    if (!folder || !ZONE || !ACCESS_KEY) return;
    await fetch(`https://${STORAGE_HOST}/${ZONE}/${folder}/${filename}`, {
        method: 'DELETE',
        headers: { AccessKey: ACCESS_KEY },
    }).catch(() => {});
};

module.exports = { uploadStreamToBunny, deleteFileFromBunny, buildFilename, FOLDERS };
