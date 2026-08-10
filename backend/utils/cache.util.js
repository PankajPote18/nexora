const cluster = require('cluster');
const { LRUCache } = require('lru-cache');

// A single in-process cache shared by every route that opts in. Keeps public
// GET endpoints (movies, categories, hero-banners, trays, subscription-plans,
// settings pages/menu) from hitting the DB on every request under concurrent
// load, without adding an external service (Redis, etc.) this project
// doesn't otherwise run. Write-triggered invalidation (see
// invalidateMiddleware) is what actually guarantees freshness — the TTL
// below is a safety net for anything that isn't invalidated explicitly, not
// the primary consistency mechanism, so it can be generous.
//
// Raised 60s -> 5min after a 1000-VU heavy load test: with a small catalog
// (~20-something movies) and a short TTL, every cache entry was expiring and
// being refetched roughly every minute throughout a multi-minute run — under
// 1000 concurrent users that produces a "thundering herd" every time a
// popular key expires (many requests missing the cache simultaneously and
// each independently hitting the DB pool at once). A longer TTL means that
// happens far less often; requestCoalesce() below handles the herd itself
// when it does happen.
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const cache = new LRUCache({ max: 500 });

// Cache-stampede prevention: while a response for a given key is being
// computed, any other request that arrives for the *same* key waits for
// that in-flight response instead of independently issuing its own
// duplicate DB query. Without this, a single expired/missing cache entry
// under high concurrency turns into N simultaneous identical queries
// (N == however many requests arrive before the first one finishes and
// repopulates the cache) — exactly the kind of "unnecessary duplicate
// queries" that pressures the connection pool hardest during a burst.
const pendingWaiters = new Map(); // key -> array of { res, timeoutId }

// Must comfortably exceed db.config.js's pool `acquire` timeout (10000ms —
// see DB_POOL_MAX/acquire there). A waiter that gives up *before* the leader
// could possibly have failed on its own doesn't fail safely, it makes things
// worse: this fallback calls next() directly, which runs the controller
// (and its own DB query) completely independently of the leader/cache, with
// no coalescing at all. Under load, the leader's own query is most likely
// slow for the exact same reason many requests piled up here in the first
// place — pool contention — so every waiter bailing out at 8s (< the 10s a
// stuck leader is still allowed to legitimately take while waiting on the
// pool) each add one more independent connection request on top of an
// already-saturated pool, at the worst possible moment. That's a
// self-reinforcing thundering herd, not a safety valve, and matches exactly
// the fast-median/long-tail/occasional-hard-failure pattern seen under a
// 3000-VU run (p95 1.6s, max 11.18s, ~0.6% hard failures concentrated on
// cached-but-cold-under-load endpoints). Set above acquire + a margin for
// the query itself to actually run once a connection is acquired, so a
// waiter only ever falls back to its own independent query once the leader
// is already known to be past the point where it could still legitimately
// succeed.
const STAMPEDE_WAIT_TIMEOUT_MS = 15000;

// Keys by the full request URL (path + query string), so `/api/movies?page=2`
// and `/api/movies?page=1` are cached independently.
const cacheMiddleware = (ttlMs = DEFAULT_TTL_MS) => (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    if (cached) {
        return res.json(cached);
    }

    if (pendingWaiters.has(key)) {
        const waiters = pendingWaiters.get(key);
        const waiter = { res };
        waiter.timeoutId = setTimeout(() => {
            // The in-flight leader request never resolved in time (slow DB,
            // crashed before responding, etc.) — fall through and let this
            // request run independently rather than hanging forever.
            const list = pendingWaiters.get(key);
            if (list) {
                const idx = list.indexOf(waiter);
                if (idx !== -1) list.splice(idx, 1);
            }
            next();
        }, STAMPEDE_WAIT_TIMEOUT_MS);
        waiters.push(waiter);
        return;
    }

    pendingWaiters.set(key, []);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
        const waiters = pendingWaiters.get(key) || [];
        pendingWaiters.delete(key);

        // Store a plain-JSON snapshot, not the raw body — controllers often
        // hand this a Sequelize model instance (or an object containing
        // one), which carries a lot of internal ORM metadata beyond the
        // actual field values. Cloning through JSON matches exactly what
        // goes over the wire, keeps cache memory to just the response
        // payload, and makes repeated cache-hit serialization cheaper (a
        // plain object needs no custom toJSON() traversal).
        let snapshot = body;
        if (res.statusCode < 400) {
            try {
                snapshot = JSON.parse(JSON.stringify(body));
                cache.set(key, snapshot, { ttl: ttlMs });
            } catch {
                // Non-serializable body (shouldn't happen for a JSON API) —
                // skip caching this one rather than fail the request.
            }
        }

        waiters.forEach(({ res: waiterRes, timeoutId }) => {
            clearTimeout(timeoutId);
            if (!waiterRes.writableEnded) {
                waiterRes.status(res.statusCode).json(snapshot);
            }
        });

        return originalJson(body);
    };
    next();
};

// Drops every cached entry whose key starts with `prefix` (e.g. '/api/movies')
// so a write is reflected on the next read instead of waiting out the TTL.
// Local-only — see `invalidate` below for the cluster-aware version every
// caller should actually use.
const invalidateLocal = (prefix) => {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
        }
    }
};

// server.js now runs this backend as a Node `cluster` (one worker process
// per CPU core, see server.js), and each worker has its own independent
// instance of this cache — a write handled by worker A would otherwise
// leave workers B/C/D still serving stale cached data until their own TTL
// expires (up to 5 minutes, see DEFAULT_TTL_MS above). A worker can't
// message a sibling directly, so this relays through the primary process
// (server.js registers the fan-out on 'fork'), which every other worker
// receives via its own 'message' listener below and applies locally. In a
// non-clustered run (cluster.isWorker is false, e.g. plain `node server.js`
// without forking, or this module used outside that context) this is a
// no-op passthrough — invalidation still works exactly as before.
if (cluster.isWorker) {
    process.on('message', (msg) => {
        if (msg && msg.type === 'cache-invalidate' && msg.fromPid !== process.pid) {
            invalidateLocal(msg.prefix);
        }
    });
}

const invalidate = (prefix) => {
    invalidateLocal(prefix);
    if (cluster.isWorker && typeof process.send === 'function') {
        process.send({ type: 'cache-invalidate', prefix, fromPid: process.pid });
    }
};

// Attach to mutating routes (POST/PUT/PATCH/DELETE) for the same resource a
// cacheMiddleware'd GET covers. Only invalidates after a successful response,
// so a failed write doesn't wipe still-valid cached reads.
const invalidateMiddleware = (prefix) => (req, res, next) => {
    res.on('finish', () => {
        if (res.statusCode < 400) {
            invalidate(prefix);
        }
    });
    next();
};

module.exports = { cache, cacheMiddleware, invalidate, invalidateMiddleware };
