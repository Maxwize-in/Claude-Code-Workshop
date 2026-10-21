'use strict';

// In-memory data layer with a small SQL-style query surface, so the report
// code reads the same way it will once this moves to Postgres.

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'expenses.json');

const tables = {
  expenses: JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')),
  categories: [
    { name: 'food',      label: 'Food & Dining',   budget: 6000 },
    { name: 'travel',    label: 'Travel',          budget: 8000 },
    { name: 'office',    label: 'Office Supplies', budget: 5000 },
    { name: 'software',  label: 'Software',        budget: 7000 },
    { name: 'utilities', label: 'Utilities',       budget: 4000 },
    { name: 'marketing', label: 'Marketing',       budget: 12000 },
  ],
};

// Query counters, handy for the /admin/stats endpoint and for profiling.
const stats = { queries: 0 };

const QUERY_RE = /^SELECT \* FROM (\w+)(?: WHERE (.+))?$/i;
const TERM_RE = /^(?:(\w+)|'([^']*)')\s*=\s*'([^']*)'$/;

// Evaluate one predicate term: either  column = 'value'  or  'literal' = 'literal'.
function matches(row, term) {
  const m = TERM_RE.exec(term.trim());
  if (!m) throw new Error(`Unsupported predicate: ${term}`);
  const left = m[1] !== undefined ? String(row[m[1]]) : m[2];
  return left === m[3];
}

// Supports:  SELECT * FROM <table> [WHERE col = 'v' [OR col = 'v' ...]]
function query(sql) {
  stats.queries += 1;
  const m = QUERY_RE.exec(sql.trim());
  if (!m) throw new Error(`Unsupported query: ${sql}`);
  const rows = tables[m[1]];
  if (!rows) throw new Error(`Unknown table: ${m[1]}`);
  if (!m[2]) return rows.slice();
  const terms = m[2].split(/\s+OR\s+/i);
  return rows.filter((row) => terms.some((t) => matches(row, t)));
}

function all() {
  return query('SELECT * FROM expenses');
}

function findCategory(name) {
  return query(`SELECT * FROM categories WHERE name = '${name}'`)[0] || null;
}

// Hot-reload the data file without restarting (used by POST /admin/reload).
function reload(file = DATA_FILE) {
  tables.expenses = fs.readJsonSync(file);
  return tables.expenses.length;
}

module.exports = { query, all, findCategory, reload, stats };
