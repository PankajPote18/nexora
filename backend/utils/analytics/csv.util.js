// Minimal, dependency-free CSV writer — this project avoids adding a library
// (json2csv, csv-stringify, etc.) for something this small; every other
// export-shaped feature in the codebase (e.g. the Razorpay response
// snapshot) also just hand-rolls its own serialization.

function escapeCsvValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// columns: [{ key, header }]; rows: array of plain objects.
function toCsv(columns, rows) {
    const headerLine = columns.map((c) => escapeCsvValue(c.header)).join(',');
    const lines = rows.map((row) => columns.map((c) => escapeCsvValue(row[c.key])).join(','));
    return [headerLine, ...lines].join('\r\n');
}

module.exports = { toCsv };
