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

    // The primary never serves HTTP (see the isPrimary/else split below) —
    // it only does the one-time sync/seed below and, afterwards, the autopay
    // billing cron's periodic queries (see the comment further down on why
    // its connection now stays open). Without an explicit DB_POOL_MAX here,
    // db.config.js's own default (30 — the same number the *entire* worker
    // fleet's budget is supposed to sum to, see TOTAL_DB_POOL_BUDGET above)
    // would apply to the primary's pool too, silently making the real
    // worst-case connection ceiling (workers' budget + primary's own
    // default) larger than documented/intended. The primary genuinely only
    // ever needs a couple of connections at a time, so give it a small,
    // explicit share instead of an unused 30-connection allowance.
    process.env.DB_POOL_MAX = String(Math.max(2, Math.floor(TOTAL_DB_POOL_BUDGET / 10)));

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

            // Reminder pipeline (RabbitMQ + cron, see backend/jobs|queues|
            // workers|services) — an isolated feature, started once here in
            // the primary process only. Starting it per-worker would fire
            // the cron N times and double-process queue jobs; the primary
            // never serves HTTP, so running it here doesn't compete with API
            // traffic either. Not awaited: RabbitMQ may be slow/unreachable
            // at boot, and this must never delay workers from starting to
            // serve requests. Failures here are logged and otherwise
            // harmless to the rest of the app (see queues/rabbitmq.js's
            // reconnect handling and the try/catch below).
            try {
                const reminderService = require('./services/reminder.service');
                const { startReminderCron } = require('./jobs/reminder.cron');
                const { startReminderWorker } = require('./workers/reminder.worker');

                reminderService.createTestSubscription();
                startReminderCron();
                startReminderWorker().catch((err) => {
                    console.error('[reminder] worker failed to start (non-fatal):', err.message);
                });
            } catch (err) {
                console.error('[reminder] failed to start reminder pipeline (non-fatal):', err.message);
            }

            // Autopay billing pipeline (RabbitMQ + cron, PayU UPI Autopay
            // recurring debits — see backend/jobs|queues|workers/
            // autopayBilling.* + services/autopayBilling.service.js). Same
            // primary-only reasoning as the reminder pipeline above. Unlike
            // that in-memory demo feature, this one is DB-backed and drives
            // real payment attempts — there's no boot-time test seed here;
            // test data comes from a real checkout plus
            // scripts/testAutopayExpiry.js compressing a real subscription's
            // expires_at.
            let stopAutopayBillingCronFn = null;
            try {
                const { startAutopayBillingCron, stopAutopayBillingCron } = require('./jobs/autopayBilling.cron');
                const { startAutopayBillingWorker } = require('./workers/autopayBilling.worker');

                startAutopayBillingCron();
                stopAutopayBillingCronFn = stopAutopayBillingCron;
                startAutopayBillingWorker().catch((err) => {
                    console.error('[autopay] worker failed to start (non-fatal):', err.message);
                });
            } catch (err) {
                console.error('[autopay] failed to start autopay billing pipeline (non-fatal):', err.message);
            }

            // Analytics nightly rollup (see CLAUDE.md §23) — same reasoning
            // as the reminder cron above: must run exactly once, not once
            // per worker, so it lives in the primary only. The per-request
            // ingestion buffer itself (services/analytics/eventBuffer.service.js)
            // is started per-worker instead, right below in the worker branch —
            // each worker handles its own tracking requests and needs its own
            // flush timer.
            try {
                const { startAnalyticsRollupCron } = require('./jobs/analyticsRollup.cron');
                startAnalyticsRollupCron();
            } catch (err) {
                console.error('[analytics] failed to start rollup cron (non-fatal):', err.message);
            }

            // The primary itself never serves HTTP traffic, but — unlike the
            // in-memory reminder pipeline — the autopay billing cron above
            // runs real DB queries (getDueSubscriptions/reconcileWithPayu)
            // from this same primary process on every tick for the lifetime
            // of the process, so its Sequelize connection can no longer be
            // closed here. (Previously this closed unconditionally, since
            // nothing in the primary touched the DB after boot — that's no
            // longer true.)

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
                // Stop the autopay billing cron from enqueueing any new
                // recurring-charge job during shutdown — this pipeline moves
                // real money against a real payment gateway, a materially
                // worse failure mode than the reminder pipeline's log-only
                // work if killed mid-flight, so (unlike that pipeline) it
                // gets an explicit stop here rather than just dying with the
                // process.
                if (stopAutopayBillingCronFn) {
                    try {
                        stopAutopayBillingCronFn();
                    } catch (err) {
                        console.error('[autopay] error stopping billing cron during shutdown:', err.message);
                    }
                }
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

    // Each worker gets its own in-memory analytics buffer/flush timer (see
    // services/analytics/eventBuffer.service.js) — unlike cache.util.js's
    // cache, nothing needs cross-worker coordination here, since every
    // worker just eventually flushes its own received hits to the shared DB.
    require('./services/analytics/eventBuffer.service').start();

    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} listening on port ${PORT}`);
    });
}
