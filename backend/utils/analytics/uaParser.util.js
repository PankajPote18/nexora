const { UAParser } = require('ua-parser-js');

// Thin wrapper around ua-parser-js so every caller gets the same shape
// regardless of which fields a given user-agent string actually populates.
// Parsing happens server-side (raw navigator.userAgent is sent once per
// session start, see src/analytics/tracker.js) rather than client-side, so
// this logic lives in one place and never ships extra weight to the browser.
function parseUserAgent(userAgentString) {
    if (!userAgentString) {
        return { deviceType: null, deviceModel: null, browser: null, browserVersion: null, os: null, osVersion: null };
    }

    const parser = new UAParser(userAgentString);
    const result = parser.getResult();

    // ua-parser-js reports device.type only for mobile/tablet/etc — anything
    // else (including a bare desktop browser) comes back undefined.
    const deviceType = result.device.type === 'mobile' ? 'mobile'
        : result.device.type === 'tablet' ? 'tablet'
        : 'desktop';

    return {
        deviceType,
        deviceModel: result.device.model || null,
        browser: result.browser.name || null,
        browserVersion: result.browser.version || null,
        os: result.os.name || null,
        osVersion: result.os.version || null
    };
}

module.exports = { parseUserAgent };
