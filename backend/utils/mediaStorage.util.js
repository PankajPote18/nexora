const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Remote layout on the VPS — mirrors /srv/clickbuz-media/<folder>, served by
// Nginx at MEDIA_BASE_URL/<folder>/<filename>.
// Only small files travel this path (banner/poster/thumbnail/subtitle); movie
// and trailer upload directly to the VPS via tus and never reach this module.
const REMOTE_BASE = process.env.SFTP_REMOTE_BASE || '/srv/clickbuz-media';
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || '').replace(/\/$/, '');

const FOLDERS = {
    banner: 'banners',
    poster: 'posters',
    thumbnail: 'thumbnails',
    subtitle: 'subtitles',
    temp: 'temp',
};

const sanitizeBaseName = (originalname) => {
    const base = path.basename(originalname, path.extname(originalname));
    return base.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
};

const buildRemoteFilename = (originalname) => {
    const ext = path.extname(originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    return `${uniqueSuffix}-${sanitizeBaseName(originalname)}${ext}`;
};

// Key-only SFTP auth — password authentication is intentionally not supported.
const sftpConfig = () => {
    if (!process.env.SFTP_PRIVATE_KEY_PATH) {
        throw new Error('SFTP_PRIVATE_KEY_PATH is not configured — key-based SFTP auth is required');
    }
    const config = {
        host: process.env.SFTP_HOST,
        port: Number(process.env.SFTP_PORT) || 22,
        username: process.env.SFTP_USERNAME,
        privateKey: fs.readFileSync(process.env.SFTP_PRIVATE_KEY_PATH),
    };
    if (process.env.SFTP_PASSPHRASE) config.passphrase = process.env.SFTP_PASSPHRASE;
    return config;
};

// Uploads one or more in-memory files to the VPS over SFTP in a single
// connection and returns { fieldname: publicUrl } for each.
// files: [{ fieldname, buffer, originalname }]
const uploadFilesToVps = async (files) => {
    if (!files.length) return {};
    if (!process.env.SFTP_HOST || !process.env.SFTP_USERNAME) {
        throw new Error('SFTP is not configured (SFTP_HOST / SFTP_USERNAME missing)');
    }

    const sftp = new SftpClient();
    const results = {};

    try {
        await sftp.connect(sftpConfig());

        for (const file of files) {
            const folder = FOLDERS[file.fieldname] || FOLDERS.temp;
            const remoteDir = `${REMOTE_BASE}/${folder}`;
            const filename = buildRemoteFilename(file.originalname);
            const remotePath = `${remoteDir}/${filename}`;

            const dirExists = await sftp.exists(remoteDir);
            if (!dirExists) {
                await sftp.mkdir(remoteDir, true);
            }

            await sftp.put(file.buffer, remotePath);

            results[file.fieldname] = `${MEDIA_BASE_URL}/${folder}/${filename}`;
        }
    } finally {
        await sftp.end().catch(() => {});
    }

    return results;
};

module.exports = { uploadFilesToVps, FOLDERS };
