'use strict';

const express = require('express');
const db = require('./db');
const report = require('./report');
const csv = require('./export');
const notify = require('./notify');

const app = express();
app.use(express.json());

const MONTH_RE = /^\d{4}-\d{2}$/;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// GET /expenses?from=YYYY-MM-DD&to=YYYY-MM-DD  (inclusive range)
app.get('/expenses', (req, res) => {
  const { from, to } = req.query;
  if (!csv.isDay(from) || !csv.isDay(to)) {
    return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
  }
  res.json(report.inRange(db.all(), from, to));
});

// GET /export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD  (inclusive range)
app.get('/export.csv', (req, res) => {
  const { from, to } = req.query;
  if (!csv.isDay(from) || !csv.isDay(to)) {
    return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
  }
  res.type('text/csv').send(csv.exportRange(from, to));
});

// GET /report/:month?category=food
app.get('/report/:month', (req, res) => {
  const { month } = req.params;
  if (!MONTH_RE.test(month)) {
    return res.status(400).json({ error: 'month must be YYYY-MM' });
  }
  res.json(report.build(month, { category: req.query.category }));
});

// POST /report/:month/notify  -> sends the report to the finance webhook
app.post('/report/:month/notify', async (req, res, next) => {
  try {
    const status = await notify.send(report.build(req.params.month, { category: req.query.category }));
    res.json({ sent: true, status });
  } catch (err) {
    next(err);
  }
});

app.post('/admin/reload', (req, res) => {
  res.json({ rows: db.reload() });
});

app.get('/admin/stats', (req, res) => {
  res.json(db.stats);
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`expense-report-module listening on :${port}`));
}

module.exports = app;
