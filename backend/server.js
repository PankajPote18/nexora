// Must be set before anything that could touch libuv's threadpool is
// required (zlib/compression, crypto, fs, dns) — libuv reads this env var
// lazily on first threadpool use, not at process start, so setting it here
// as the very first statement works. Default is 4 regardless of CPU count;
// this backend gzip-compresses every response (see app.js's compression()
// middleware), and a 3000-VU load test showed request throughput hard-
// plateau while every request that did complete stayed fast and clean
// (backend/logs/access.log was ~100% 200s) — the ceiling was the process's
// ability to service concurrent work, not the database. A bigger threadpool
// gives compression (and any other libuv-threadpool work) more room before
// queueing.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';

const cluster = require('cluster');
const os = require('os');

// Round-robin is the default connection-distribution policy on every
// platform except Windows, which defaults to SCHED_NONE (leaves it to the
// OS) — verified against Node's own cluster docs. On this dev machine that
// left 3 of 4 workers completely idle under a test burst (only the primary-
// adjacent worker's CPU moved at all), which would have silently defeated
// the entire point of clustering. Must be set before the first `fork()` —
// it's frozen after that.
cluster.schedulingPolicy = cluster.SCHED_RR;

require('dotenv').config({ quiet: true });

const PORT = process.env.PORT || 5000;

// Node's cluster module: fork one worker process per CPU core so this
// backend can actually use all of them — a single Node process only ever
// runs JS on one core no matter how many are available (confirmed 4 cores
// present, 1 process running, during the load test that plateaued). Workers
// share the listen port; the OS/cluster module load-balances incoming
// connections across them, which directly raises the connection-accept/
// request-processing ceiling that was the real bottleneck at 3000 VUs.
//
// WEB_CONCURRENCY (Heroku/Render's own convention) overrides the CPU-count
// default — useful to cap worker count explicitly on a host with more cores
// than makes sense to fork, or to force single-process mode (set to 1) for
// local debugging where per-worker stdout interleaving is confusing.
const numWorkers = parseInt(process.env.WEB_CONCURRENCY, 10) || os.cpus().length;

// DB pool budget is shared across however many workers actually serve
// traffic — see db.config.js's DB_POOL_MAX comment for why (the database
// itself was never the bottleneck here; this just keeps total connection
// pressure roughly where it was before clustering).
const TOTAL_DB_POOL_BUDGET = 30;
const perWorkerPoolMax = Math.max(5, Math.floor(TOTAL_DB_POOL_BUDGET / numWorkers));

if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} starting ${numWorkers} worker(s)...`);

    // DB sync/seed must happen exactly once, not once per worker — running
    // sequelize.sync({ alter: true }) and the seed-if-empty checks
    // concurrently from multiple processes risks duplicate seed rows (a
    // classic check-then-act race: several workers could all see count===0
    // before any of them finishes inserting). The primary does this alone,
    // then forks workers only once it's done; workers connect to an
    // already-synced, already-seeded DB.
    const { sequelize } = require('./config/db.config');
    const { Genre, Language, AgeCertificate, MatureTheme, Badge, Vendor } = require('./models');

    const seedMasterData = async () => {
        const genreCount = await Genre.count();
        if (genreCount === 0) {
            await Genre.bulkCreate([
                { name: 'Action', sort_order: 1 },
                { name: 'Comedy', sort_order: 2 },
                { name: 'Drama', sort_order: 3 },
                { name: 'Romantic', sort_order: 4 },
            ]);
        }

        const langCount = await Language.count();
        if (langCount === 0) {
            await Language.bulkCreate([
                { name: 'English', code: 'Eng', sort_order: 1 },
                { name: 'Hindi', code: 'Hi', sort_order: 2 },
                { name: 'Marathi', code: 'Mar', sort_order: 3 },
            ]);
        }

        const ageCount = await AgeCertificate.count();
        if (ageCount === 0) {
            await AgeCertificate.bulkCreate([
                { name: 'U', description: 'Universal - suitable for all ages', sort_order: 1 },
                { name: 'U/A 13+', description: 'Parental guidance for children under 13', sort_order: 2 },
                { name: 'A', description: 'Adults only (18+)', sort_order: 3 },
            ]);
        }

        const themeCount = await MatureTheme.count();
        if (themeCount === 0) {
            await MatureTheme.bulkCreate([
                { name: 'None', sort_order: 1 },
                { name: 'Violence', sort_order: 2 },
                { name: 'Sexual', sort_order: 3 },
            ]);
        }

        const badgeCount = await Badge.count();
        if (badgeCount === 0) {
            await Badge.bulkCreate([
                { name: 'Hot', bg_color: '#670005', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 1 },
                { name: 'New', bg_color: '#014207', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 2 },
                { name: 'Original', bg_color: '#292929', text_color: '#FFFFFF', border_gradient: 'linear-gradient(to bottom, #111111, #FFFFFF)', sort_order: 3 },
            ]);
        }

        const vendorCount = await Vendor.count();
        if (vendorCount === 0) {
            await Vendor.bulkCreate([
                { name: 'Vendor A' },
                { name: 'Vendor B' },
                { name: 'Vendor C' },
            ]);
        }
    };

    sequelize.authenticate()
        .then(async () => {
            console.log('Database connection has been established successfully.');

            await sequelize.sync({ alter: true });
            console.log('Database synchronized.');

            await seedMasterData();
            console.log('Master data seeded.');

            // The primary itself never serves HTTP traffic or holds a
            // request-serving connection pool open — close it so it isn't
            // sitting on idle connections for no reason once workers (each
            // with their own pool) take over.
            await sequelize.close();

            const workers = new Set();
            const forkWorker = () => {
                const worker = cluster.fork({ DB_POOL_MAX: String(perWorkerPoolMax) });
                workers.add(worker);
                // Cross-worker cache-invalidation relay (see cache.util.js)
                // — a worker can't message a sibling directly, so it sends
                // here and the primary fans it out to every other worker.
                worker.on('message', (msg) => {
                    if (msg && msg.type === 'cache-invalidate') {
                        for (const w of workers) {
                            if (w !== worker && w.isConnected()) {
                                w.send(msg);
                            }
                        }
                    }
                });
            };

            for (let i = 0; i < numWorkers; i++) {
                forkWorker();
            }

            let shuttingDown = false;
            cluster.on('exit', (worker, code, signal) => {
                workers.delete(worker);
                if (!shuttingDown && !worker.exitedAfterDisconnect) {
                    console.error(`Worker ${worker.process.pid} died (code=${code} signal=${signal}) — restarting it.`);
                    forkWorker();
                }
            });

            // Without this, killing the primary (e.g. nodemon restarting on
            // a file change during development) leaves forked workers
            // running as orphans — they'd keep holding DB connections and
            // the listen port instead of exiting with their parent.
            const shutdown = () => {
                shuttingDown = true;
                for (const worker of workers) {
                    worker.kill();
                }
                process.exit(0);
            };
            process.on('SIGINT', shutdown);
            process.on('SIGTERM', shutdown);
        })
        .catch(err => {
            console.error('Unable to connect to the database:', err);
            process.exit(1);
        });
} else {
    // Worker process: just serve HTTP. No sync/seed here — the primary
    // already did that before any worker was forked.
    const app = require('./app');
    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} listening on port ${PORT}`);
    });
}
