'use strict';

const test = require('node:test');
const assert = require('node:assert');
const csv = require('../src/export');

test('toCsv writes the header row first', () => {
  const out = csv.toCsv([]);
  assert.equal(out.split('\n')[0], 'date,category,amount,note');
});

test('toCsv quotes notes that contain commas', () => {
  const out = csv.toCsv([{ date: '2026-08-02', category: 'food', amount: 420, note: 'Team lunch, Saravana Bhavan' }]);
  assert.equal(out.split('\n')[1], '2026-08-02,food,420,"Team lunch, Saravana Bhavan"');
});

test('exportRange returns at least one data row for August', () => {
  const out = csv.exportRange('2026-08-01', '2026-08-31');
  assert.ok(out.split('\n').length > 2);
});

test('exportRange rejects malformed dates', () => {
  assert.throws(() => csv.exportRange('01-08-2026', '2026-08-31'), RangeError);
});
