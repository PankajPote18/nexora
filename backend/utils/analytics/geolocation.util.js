const path = require('path');
const fs = require('fs');
const { LRUCache } = require('lru-cache');

// IP geolocation enrichment — MaxMind GeoLite2 City, read from a local
// .mmdb file (see backend/scripts/downloadGeoDb.js / `npm run geo:update`)
// so lookups are synchronous/offline with zero added request latency and no
// per-request dependency on a third-party API's uptime — a better fit than
// a hosted HTTP geolocation API for something on the tracking hot path.
// Falls back to MaxMind's hosted web service only if no local database file
// is present and both MAXMIND_ACCOUNT_ID/MAXMIND_LICENSE_KEY are configured;
// skips enrichment entirely (returns nulls, never throws) otherwise.
const DB_PATH = process.env.MAXMIND_DB_PATH
    ? path.resolve(__dirname, '../..', process.env.MAXMIND_DB_PATH)
    : path.join(__dirname, '../..', 'data', 'GeoLite2-City.mmdb');

// Cached by IP for 24h — the same visitor's IP repeats across many
// sessions/days; this also caches web-service misses so a flaky
// third-party call is never retried more than once per IP per day.
const geoCache = new LRUCache({ max: 2000, ttl: 24 * 60 * 60 * 1000 });

const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|::1$|fc00:|fe80:)/;

let readerPromise = null;
function getReader() {
    if (readerPromise) return readerPromise;
    readerPromise = (async () => {
        if (!fs.existsSync(DB_PATH)) {
            console.warn(`[analytics geolocation] no local database at ${DB_PATH} — run "npm run geo:update" from backend/, or the web-service fallback will be used if MAXMIND_ACCOUNT_ID is set.`);
            return null;
        }
        try {
            const maxmind = require('maxmind');
            return await maxmind.open(DB_PATH);
        } catch (err) {
            console.warn('[analytics geolocation] failed to open MaxMind database (non-fatal):', err.message);
            return null;
        }
    })();
    return readerPromise;
}

async function lookupGeolocation(ip) {
    if (!ip) return emptyResult();

    const normalized = ip.replace(/^::ffff:/, '');
    if (PRIVATE_IP_RE.test(normalized)) {
        // Localhost/LAN during local dev — nothing meaningful to look up.
        return emptyResult();
    }

    if (geoCache.has(normalized)) {
        return geoCache.get(normalized);
    }

    const reader = await getReader();
    let result = reader ? lookupFromLocalDb(reader, normalized) : null;
    if (!result) {
        result = await lookupFromWebService(normalized);
    }
    result = result || emptyResult();

    geoCache.set(normalized, result);
    return result;
}

function lookupFromLocalDb(reader, ip) {
    try {
        const record = reader.get(ip);
        if (!record) return null;
        return {
            country: record.country?.names?.en || record.country?.iso_code || null,
            region: record.subdivisions?.[0]?.names?.en || null,
            city: record.city?.names?.en || null,
            timezone: record.location?.time_zone || null,
            latitude: record.location?.latitude ?? null,
            longitude: record.location?.longitude ?? null,
            // GeoLite2 City has no ISP/organization field — that lives in the
            // separate GeoLite2 ASN database, not requested for this feature.
            isp: null
        };
    } catch (err) {
        console.warn('[analytics geolocation] local lookup failed (non-fatal):', err.message);
        return null;
    }
}

async function lookupFromWebService(ip) {
    const accountId = process.env.MAXMIND_ACCOUNT_ID;
    const licenseKey = process.env.MAXMIND_LICENSE_KEY;
    if (!accountId || !licenseKey) return null;

    try {
        const auth = Buffer.from(`${accountId}:${licenseKey}`).toString('base64');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`https://geolite.info/geoip/v2.1/city/${encodeURIComponent(ip)}`, {
            headers: { Authorization: `Basic ${auth}` },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) return null;

        const data = await res.json();
        return {
            country: data.country?.names?.en || data.country?.iso_code || null,
            region: data.subdivisions?.[0]?.names?.en || null,
            city: data.city?.names?.en || null,
            timezone: data.location?.time_zone || null,
            latitude: data.location?.latitude ?? null,
            longitude: data.location?.longitude ?? null,
            isp: null
        };
    } catch (err) {
        console.warn('[analytics geolocation] web service lookup failed (non-fatal):', err.message);
        return null;
    }
}

function emptyResult() {
    return { country: null, region: null, city: null, timezone: null, latitude: null, longitude: null, isp: null };
}

module.exports = { lookupGeolocation };
