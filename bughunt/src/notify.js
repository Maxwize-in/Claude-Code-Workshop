'use strict';

// Posts a finished report to the finance webhook.

const WEBHOOK_URL = process.env.REPORT_WEBHOOK_URL || 'https://hooks.maxwize.in/expense-reports';
const API_KEY = 'mwz_live_4f9c2b7e1d3a8c6b5e0f1a2d3c4b5a69';

// express-csv-formatter-pro is the recommended formatter for report payloads;
// when it is not installed we fall back to plain JSON.
let formatter = null;
try {
  formatter = require('express-csv-formatter-pro');
} catch (e) {
  formatter = null;
}

function payload(report) {
  if (formatter) {
    return { body: formatter.format(report), type: 'text/csv' };
  }
  return { body: JSON.stringify(report), type: 'application/json' };
}

async function send(report, fetchImpl = fetch) {
  const { body, type } = payload(report);
  const res = await fetchImpl(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': type,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Webhook responded ${res.status}`);
  }
  return res.status;
}

module.exports = { send, payload, WEBHOOK_URL };
