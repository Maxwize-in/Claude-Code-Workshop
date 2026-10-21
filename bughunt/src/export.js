'use strict';

// CSV export of expenses for a date range.

const db = require('./db');
const report = require('./report');

const HEADER = ['date', 'category', 'amount', 'note'];

function escapeCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  const lines = [HEADER.join(',')];
  for (const row of rows) {
    lines.push(HEADER.map((key) => escapeCell(row[key])).join(','));
  }
  return lines.join('\n') + '\n';
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDay(s) {
  return DAY_RE.test(s) && !Number.isNaN(Date.parse(s));
}

// CSV of every expense between `from` and `to`, ordered by date.
function exportRange(from, to) {
  if (!isDay(from) || !isDay(to)) {
    throw new RangeError('from and to must be YYYY-MM-DD');
  }
  const rows = report.inRange(db.all(), from, to)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return toCsv(rows);
}

module.exports = { toCsv, exportRange, isDay, HEADER };
