const fs = require('fs');
const path = require('path');

// Logging under real load needs to be (a) async, so it never blocks the
// event loop, and (b) selective, so it doesn't itself become per-request
// overhead — logging every single request here on top of morgan's access
// log would just reintroduce the "excessive console logging" cost this is
// meant to avoid. Only failed (>=400) or slow (>SLOW_REQUEST_THRESHOLD_MS)
// requests get a line written here, via a plain fs.WriteStream (async I/O,
// not the synchronous-on-Windows-TTY console.log path morgan's default
// stdout stream can hit).
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
const errorLogStream = fs.createWriteStream(path.join(logsDir, 'errors.log'), { flags: 'a' });

const SLOW_REQUEST_THRESHOLD_MS = 1000;

module.exports = function requestLogger(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        if (res.statusCode >= 400 || durationMs > SLOW_REQUEST_THRESHOLD_MS) {
            const line = `${new Date().toISOString()} ${req.method} ${req.originalUrl} status=${res.statusCode} duration=${durationMs.toFixed(1)}ms\n`;
            errorLogStream.write(line);
        }
    });

    next();
};

module.exports.errorLogStream = errorLogStream;
