#!/usr/bin/env node
// Generates day03.md ... day30.md and the Claude commands /day3 ... /day30 from plan.json so they never drift.
// Day 1 and Day 2 are the workshop; the 30 days continue with Day 3 to Day 30, four weeks of seven days.
// Usage: node build-days.js        (run from anywhere; paths are relative to this file)
// Exits 1 if plan.json breaks a rule, so a bad plan never produces day files.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const commandsDir = path.join(dir, '..', '..', '.claude', 'commands');
const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));

const FIRST = 3, LAST = 30;
const THEMES = {
  1: 'The loop, daily',
  2: 'Catch its mistakes',
  3: 'Leverage',
  4: 'Ship it and make it stick',
};
const KIND_LABEL = { do: 'Do', read: 'Read', share: 'Share' };
const DOC_URL = /^https:\/\/code\.claude\.com\/docs\/en\/[a-z-]+$/;
const CARD = /^cards\/[A-Za-z0-9.-]+\.(md|template)/;
const keyOf = (n) => 'd' + String(n).padStart(2, '0');

const errors = [];
const dayIds = Object.keys(plan);
if (dayIds.length !== LAST - FIRST + 1) errors.push(`expected ${LAST - FIRST + 1} days, found ${dayIds.length}`);
for (const k of dayIds) {
  const n = /^d(\d{2})$/.test(k) ? parseInt(k.slice(1), 10) : NaN;
  if (!(n >= FIRST && n <= LAST)) errors.push(`${k}: not a day from ${keyOf(FIRST)} to ${keyOf(LAST)}`);
}

let total = 0;
const seen = new Set();
for (let n = FIRST; n <= LAST; n++) {
  const key = keyOf(n);
  const day = plan[key];
  if (!day) { errors.push(`${key} missing`); continue; }
  const expectedWeek = Math.floor((n - FIRST) / 7) + 1;
  if (day.week !== expectedWeek) errors.push(`${key}: week ${day.week}, expected ${expectedWeek}`);
  for (const f of ['title', 'why', 'done']) if (!day[f]) errors.push(`${key}: missing ${f}`);
  if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|this week|tomorrow)\b/i.test(JSON.stringify(day))) {
    errors.push(`${key}: no calendar words; the 30 days have no dates`);
  }
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
if (total < 56 || total > 84) errors.push(`total items ${total}, expected 56 to 84`);

if (errors.length) {
  console.error('plan.json has problems:\n  ' + errors.join('\n  '));
  process.exit(1);
}

const command = (n, title) => `30 days, Day ${n}: ${title}. Coach me through it.

1. Run \`node mw.js day ${n}\`. If it says Day ${n} is not open yet, tell me which day to finish first, offer /next, and stop. If it says the 30 days are not started, tell me they open after task 4.3 with \`node mw.js start30\`, and stop.
2. For each item not yet done (⬜): say in 2 lines what to do, then do it with me.
   - "do" items happen in my own repo (show the diff and ask before editing anything there).
   - "read" items: open the linked page or card and ask me one question about it.
   - "share" items: draft the one line I will post in the WhatsApp group.
3. After each item, run \`node mw.js done <itemId>\`.
4. Finish with \`node mw.js day ${n}\`. When it says the next day is open, tell me: "Day ${n} done. Next time, type /next."

Keep it to about 20 minutes. Short replies. Never put code, file contents or paths into any mw command.
`;

const words = (s) => s.split(/\s+/).filter(Boolean).length;
const warnings = [];
for (let n = FIRST; n <= LAST; n++) {
  const day = plan[keyOf(n)];
  const nn = String(n).padStart(2, '0');
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
    n < LAST
      ? `Mark each item with \`node mw.js done <id>\`. Day ${n + 1} opens when all of these are done: \`/next\`.`
      : 'Mark each item with `node mw.js done <id>`. This is the last day.',
    '',
  ];
  const body = lines.join('\n');
  const w = words(body);
  if (w < 60 || w > 120) warnings.push(`day${nn}.md is ${w} words (want 60 to 120)`);
  fs.writeFileSync(path.join(dir, `day${nn}.md`), body);
  fs.writeFileSync(path.join(commandsDir, `day${n}.md`), command(n, day.title));
}

console.log(`wrote ${LAST - FIRST + 1} day files and /day${FIRST} to /day${LAST}, ${total} items`);
if (warnings.length) {
  console.error('word count warnings:\n  ' + warnings.join('\n  '));
  process.exit(2);
}
