const crypto = require('crypto');

// Raw IPs are never persisted anywhere in the analytics module (see
// CLAUDE.md §23 / the analytics models) — only this salted, one-way hash, so
// a visitor can still be deduplicated/rate-limited per-IP without storing
// personal data. Salt is required in production; a fixed dev fallback keeps
// local testing working without extra setup, same pattern as
// JWT_SECRET's placeholder in backend/.env.example.
const SALT = process.env.ANALYTICS_IP_HASH_SALT || 'clickbuz-analytics-dev-salt-change-in-production';

function hashIp(ip) {
    if (!ip) return null;
    // Strip an IPv6-mapped IPv4 prefix ("::ffff:1.2.3.4") so the same client
    // hashes identically regardless of which family Express/Node reports.
    const normalized = ip.replace(/^::ffff:/, '');
    return crypto.createHash('sha256').update(`${normalized}:${SALT}`).digest('hex');
}

// Best-effort real client IP: production sits behind an Nginx reverse proxy,
// so req.ip alone is the proxy's own address unless `trust proxy` is
// configured app-wide — this project doesn't set that globally (would affect
// every route, not just analytics), so read the header directly here
// instead, same approach payment.controller.js already uses for s2s_client_ip.
function getClientIp(req) {
    // Production Nginx (see deploy/nginx/clickbuz.conf) sets X-Real-IP to the
    // connecting address — unlike the first X-Forwarded-For entry, a client
    // can't spoof it, so prefer it when present.
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return realIp.trim();
    }
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || null;
}

module.exports = { hashIp, getClientIp };
