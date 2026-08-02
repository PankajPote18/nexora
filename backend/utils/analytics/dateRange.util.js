const { Op } = require('sequelize');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function addDaysStr(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

// Shared ?from=YYYY-MM-DD&to=YYYY-MM-DD parsing for every analytics
// dashboard/visitor-list endpoint — defaults to the last 30 days (inclusive)
// when either bound is missing/malformed.
function parseDateRange(query = {}) {
    const to = DATE_RE.test(query.to) ? query.to : todayStr();
    const from = DATE_RE.test(query.from) ? query.from : addDaysStr(to, -29);

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDateExclusive = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000);

    return {
        from,
        to,
        fromDate,
        toDateExclusive,
        sequelizeRange: { [Op.gte]: fromDate, [Op.lt]: toDateExclusive }
    };
}

module.exports = { parseDateRange, todayStr, addDaysStr };
