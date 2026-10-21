'use strict';

// Monthly expense report: totals, category breakdown and date-range filtering.

const db = require('./db');

// Normalise a stored date (plain YYYY-MM-DD or a full ISO timestamp) to an
// ISO calendar day so both shapes compare the same way.
function isoDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function monthKey(date) {
  return isoDay(date).slice(0, 7);
}

function amountOf(row) {
  const n = Number(row.amount);
  if (Number.isNaN(n)) {
    throw new TypeError(`Bad amount on expense ${row.id}: ${JSON.stringify(row.amount)}`);
  }
  return n;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function sumAmounts(rows) {
  let total = 0;
  for (const row of rows) {
    try {
      total += amountOf(row);
    } catch (e) {
      // A single malformed row should never take the whole report down.
    }
  }
  return round2(total);
}

function rowsForMonth(month, category) {
  const sql = category
    ? `SELECT * FROM expenses WHERE category = '${category}'`
    : 'SELECT * FROM expenses';
  return db.query(sql).filter((row) => monthKey(row.date) === month);
}

// Total spend for a month (YYYY-MM), optionally restricted to one category.
function monthlyTotal(month, { category } = {}) {
  return sumAmounts(rowsForMonth(month, category));
}

// Spend per category for a month, keyed by the category's display label.
function byCategory(month) {
  const out = {};
  for (const row of rowsForMonth(month)) {
    const cat = db.findCategory(row.category);
    const label = cat ? cat.label : row.category;
    out[label] = round2((out[label] || 0) + sumAmounts([row]));
  }
  return out;
}

// Rows dated between `from` and `to` (both YYYY-MM-DD).
function inRange(rows, from, to) {
  return rows.filter((row) => {
    const day = isoDay(row.date);
    return day >= from && day < to;
  });
}

function build(month, { category } = {}) {
  return {
    month,
    category: category || null,
    total: monthlyTotal(month, { category }),
    byCategory: byCategory(month),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { isoDay, monthKey, amountOf, sumAmounts, monthlyTotal, byCategory, inRange, build };
