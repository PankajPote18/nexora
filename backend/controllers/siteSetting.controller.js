const { SiteSetting } = require('../models');

// Only these keys can be read/written through the API. Values are image URLs
// (as returned by POST /api/upload) or null to clear.
const ALLOWED_KEYS = [
    'explore_plans_bg_desktop',
    'explore_plans_bg_mobile',
];

const isHttpUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
};

// GET /api/site-settings -> { key: value } for every allowed key (null when unset)
exports.getAll = async (req, res) => {
    try {
        const rows = await SiteSetting.findAll({ where: { key: ALLOWED_KEYS } });
        const settings = Object.fromEntries(ALLOWED_KEYS.map((key) => [key, null]));
        for (const row of rows) settings[row.key] = row.value;
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching site settings' });
    }
};

// PUT /api/site-settings  body: { explore_plans_bg_desktop: "https://..." | null, ... }
// Only the keys present in the body are changed.
exports.update = async (req, res) => {
    try {
        const body = req.body || {};
        const keys = Object.keys(body);

        if (keys.length === 0) {
            return res.status(400).json({ message: 'No settings provided' });
        }
        const unknown = keys.filter((key) => !ALLOWED_KEYS.includes(key));
        if (unknown.length > 0) {
            return res.status(400).json({ message: `Unknown setting(s): ${unknown.join(', ')}` });
        }
        for (const key of keys) {
            const value = body[key];
            if (value !== null && value !== '' && (typeof value !== 'string' || !isHttpUrl(value))) {
                return res.status(400).json({ message: `${key} must be an image URL or null` });
            }
        }

        for (const key of keys) {
            const value = body[key];
            if (value === null || value === '') {
                await SiteSetting.destroy({ where: { key } });
            } else {
                await SiteSetting.upsert({ key, value });
            }
        }

        const rows = await SiteSetting.findAll({ where: { key: ALLOWED_KEYS } });
        const settings = Object.fromEntries(ALLOWED_KEYS.map((key) => [key, null]));
        for (const row of rows) settings[row.key] = row.value;
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating site settings' });
    }
};
