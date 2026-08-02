const { Op } = require('sequelize');
const { Session } = require('../../models');
const { parseDateRange } = require('../../utils/analytics/dateRange.util');
const { toCsv } = require('../../utils/analytics/csv.util');
const { buildSessionFilters, serializeSessionRow } = require('./visitors.controller');

// Hard ceiling on a single export — this is a "current filtered data" /
// "custom date range" export button, not a full warehouse dump; a table
// with millions of rows needs a real batch/offline export path, which is
// out of scope here. 50k rows is generous for what this button is for and
// keeps the request comfortably inside normal response-time/memory bounds.
const MAX_EXPORT_ROWS = 50000;

const COLUMNS = [
    { key: 'date', header: 'Date' },
    { key: 'visitorId', header: 'Visitor ID' },
    { key: 'sessionId', header: 'Session ID' },
    { key: 'source', header: 'Source' },
    { key: 'medium', header: 'Medium' },
    { key: 'campaign', header: 'Campaign' },
    { key: 'country', header: 'Country' },
    { key: 'state', header: 'State' },
    { key: 'city', header: 'City' },
    { key: 'device', header: 'Device' },
    { key: 'browser', header: 'Browser' },
    { key: 'os', header: 'OS' },
    { key: 'landingPage', header: 'Landing Page' },
    { key: 'exitPage', header: 'Exit Page' },
    { key: 'sessionDuration', header: 'Session Duration (s)' },
    { key: 'pagesViewed', header: 'Pages Viewed' },
    { key: 'conversion', header: 'Conversion' },
    { key: 'lastActivity', header: 'Last Activity' },
    { key: 'isReturning', header: 'Returning Visitor' }
];

// GET /api/analytics/export/csv?from&to&all=1&<same filters as GET /visitors>
// `all=1` ignores the from/to range entirely (the "entire dataset" export
// option); otherwise this exports exactly what the visitor table's current
// filters would show (the "current filtered data" / "custom date range" options).
exports.exportCsv = async (req, res) => {
    try {
        const query = { ...req.query };
        if (query.all === '1') {
            delete query.from;
            delete query.to;
        }
        const { sequelizeRange } = query.all === '1'
            ? { sequelizeRange: { [Op.gte]: new Date(0) } }
            : parseDateRange(query);

        const { where, visitorInclude } = buildSessionFilters(query, sequelizeRange);

        const rows = await Session.findAll({
            where,
            include: [visitorInclude],
            order: [['started_at', 'DESC']],
            limit: MAX_EXPORT_ROWS
        });

        const csv = toCsv(COLUMNS, rows.map(serializeSessionRow));
        const filename = `clickbuz-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csv);
    } catch (err) {
        console.error('Error exporting analytics CSV:', err);
        return res.status(500).json({ message: 'Server error exporting analytics data' });
    }
};
