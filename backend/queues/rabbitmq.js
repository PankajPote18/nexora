// Single shared RabbitMQ connection/channel for the reminder feature (see
// CLAUDE.md §18 — reuse one connection rather than opening a new one per
// publish/consume call). Isolated to this feature: nothing outside
// jobs/queues/workers/services for reminders touches this file.
//
// Connection is lazy (first connect() call wins) and self-healing — if
// RabbitMQ is down at boot or drops mid-run, this schedules a reconnect
// instead of throwing, so a RabbitMQ outage never crashes the backend or
// blocks any existing API route (none of which depend on this module).

const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const RECONNECT_DELAY_MS = parseInt(process.env.RABBITMQ_RECONNECT_DELAY_MS, 10) || 5000;

// Production RABBITMQ_URL carries a username/password — never log it raw.
function redactUrl(url) {
    try {
        const u = new URL(url);
        if (u.password) u.password = '***';
        return u.toString();
    } catch {
        return '(unparseable RABBITMQ_URL)';
    }
}
const SAFE_RABBITMQ_URL = redactUrl(RABBITMQ_URL);

// Callbacks re-run on every successful (re)connect — a consumer registered on
// a channel dies with that channel, so it has to be set up again each time.
const connectListeners = [];
function onConnect(listener) {
    connectListeners.push(listener);
}

// amqplib can reject with an AggregateError whose own .message is empty
// (e.g. plain ECONNREFUSED) — fall back to .code/.name so failures are
// never logged as a blank, useless string.
function describeError(err) {
    return err.message || err.code || err.name || String(err);
}

let connection = null;
let channel = null;
let connectingPromise = null;
let reconnectTimer = null;

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect().catch(() => {
            // connect() already logs the failure and reschedules itself.
        });
    }, RECONNECT_DELAY_MS);
}

// Resolves to a usable channel, or null if RabbitMQ is currently unreachable
// (callers must treat null as "try again later", never throw/crash on it).
async function connect() {
    if (channel) return channel;
    if (connectingPromise) return connectingPromise;

    connectingPromise = (async () => {
        try {
            connection = await amqp.connect(RABBITMQ_URL);

            connection.on('error', (err) => {
                console.error('[rabbitmq] connection error:', describeError(err));
            });
            connection.on('close', () => {
                console.warn(`[rabbitmq] connection closed — reconnecting in ${RECONNECT_DELAY_MS}ms`);
                channel = null;
                connection = null;
                scheduleReconnect();
            });

            channel = await connection.createChannel();
            // One unacked job per consumer at a time — fair dispatch, and
            // caps how much work is in-flight if the worker falls behind.
            await channel.prefetch(1);

            channel.on('error', (err) => {
                console.error('[rabbitmq] channel error:', describeError(err));
            });

            console.log(`[rabbitmq] connected (${SAFE_RABBITMQ_URL})`);
            for (const listener of connectListeners) {
                try {
                    await listener(channel);
                } catch (err) {
                    console.error('[rabbitmq] onConnect listener failed:', describeError(err));
                }
            }
            return channel;
        } catch (err) {
            console.error('[rabbitmq] connection failed:', describeError(err));
            connection = null;
            channel = null;
            scheduleReconnect();
            return null;
        } finally {
            connectingPromise = null;
        }
    })();

    return connectingPromise;
}

function getChannel() {
    return channel;
}

async function close() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
    } catch (err) {
        console.error('[rabbitmq] error during shutdown:', describeError(err));
    } finally {
        channel = null;
        connection = null;
    }
}

module.exports = { connect, getChannel, close, onConnect, RABBITMQ_URL: SAFE_RABBITMQ_URL };
