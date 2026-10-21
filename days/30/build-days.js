#!/usr/bin/env node
// Generates day01.md ... day30.md from plan.json so the two never drift.
// Usage: node build-days.js        (run from anywhere; paths are relative to this file)
// Exits 1 if plan.json breaks a rule, so a bad plan never produces day files.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));

const THEMES = {
  1: 'Brief like a lead',
  2: 'The loop, daily',
  3: 'Catch its mistakes',
  4: 'Leverage',
  5: 'Ship something',
  6: 'Make it stick',
};
const KIND_LABEL = { do: 'Do', read: 'Read', share: 'Share' };
const DOC_URL = /^https:\/\/code\.claude\.com\/docs\/en\/[a-z-]+$/;
const CARD = /^cards\/[A-Za-z0-9.-]+\.(md|template)/;

const errors = [];
const dayIds = Object.keys(plan);
if (dayIds.length !== 30) errors.push(`expected 30 days, found ${dayIds.length}`);

let total = 0;
const seen = new Set();
for (let n = 1; n <= 30; n++) {
  const key = 'd' + String(n).padStart(2, '0');
  const day = plan[key];
  if (!day) { errors.push(`${key} missing`); continue; }
  const expectedWeek = Math.ceil(n / 5);
  if (day.week !== expectedWeek) errors.push(`${key}: week ${day.week}, expected ${expectedWeek}`);
  for (const f of ['title', 'why', 'done']) if (!day[f]) errors.push(`${key}: missing ${f}`);
  if (!Array.isArray(day.items) || day.items.length < 2 || day.items.length > 3) {
    errors.push(`${key}: needs 2 or 3 items`); continue;
  }
  day.items.forEach((it, i) => {
    total++;
    const wantId = key + 'abc'[i];
    if (it.id !== wantId) errors.push(`${key}: item ${i} id ${it.id}, expected ${wantId}`);
    if (seen.has(it.id)) errors.push(`duplicate id ${it.id}`);
    seen.add(it.id);
    if (!KIND_LABEL[it.kind]) errors.push(`${it.id}: bad kind ${it.kind}`);
    if (!it.text) errors.push(`${it.id}: empty text`);
    if (it.kind === 'read' && !DOC_URL.test(it.text) && !CARD.test(it.text)) {
      errors.push(`${it.id}: read item must name one docs URL or one card: ${it.text}`);
    }
  });
}
if (total < 60 || total > 90) errors.push(`total items ${total}, expected 60 to 90`);

if (errors.length) {
  console.error('plan.json has problems:\n  ' + errors.join('\n  '));
  process.exit(1);
}

const words = (s) => s.split(/\s+/).filter(Boolean).length;
const warnings = [];
for (const key of Object.keys(plan)) {
  const day = plan[key];
  const n = key.slice(1);
  const lines = [
    `# Day ${n}: ${day.title}`,
    '',
    `Week ${day.week}: ${THEMES[day.week]}`,
    '',
    `Why: ${day.why}`,
    '',
    ...day.items.map((it) => `- [ ] [${it.id}] ${KIND_LABEL[it.kind]}: ${it.text}`),
    '',
    `Done when: ${day.done}`,
    '',
    `Mark each item with \`node mw.js done <id>\`. Tomorrow: \`node mw.js today\`.`,
    '',
  ];
  const body = lines.join('\n');
  const w = words(body);
  if (w < 60 || w > 120) warnings.push(`day${n}.md is ${w} words (want 60 to 120)`);
  fs.writeFileSync(path.join(dir, `day${n}.md`), body);
}

console.log(`wrote 30 day files, ${total} items`);
if (warnings.length) {
  console.error('word count warnings:\n  ' + warnings.join('\n  '));
  process.exit(2);
}
