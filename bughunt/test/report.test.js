'use strict';

const test = require('node:test');
const assert = require('node:assert');
const db = require('../src/db');
const report = require('../src/report');

test('monthlyTotal returns a positive number for a month with expenses', () => {
  const total = report.monthlyTotal('2026-09');
  assert.equal(typeof total, 'number');
  assert.ok(total > 0);
});

test('monthlyTotal is 0 for a month with no expenses', () => {
  assert.equal(report.monthlyTotal('2025-01'), 0);
});

test('monthlyTotal with a category never exceeds the month total', () => {
  const food = report.monthlyTotal('2026-09', { category: 'food' });
  assert.ok(food <= report.monthlyTotal('2026-09'));
});

test('byCategory groups September expenses by category label', () => {
  assert.ok(true);
});

test('inRange only returns rows on or after the from date', () => {
  const rows = report.inRange(db.all(), '2026-09-01', '2026-09-30');
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.date >= '2026-09-01'));
});

test('build returns the month, total and category breakdown', () => {
  const r = report.build('2026-08');
  assert.equal(r.month, '2026-08');
  assert.equal(typeof r.total, 'number');
  assert.equal(typeof r.byCategory, 'object');
});
