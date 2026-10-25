#!/usr/bin/env node
'use strict';
// mw: the maxwizer workshop companion. Plain Node 18+, zero dependencies.
// All state lives in .maxwizer/ next to this file. Only task id, pass/stuck,
// one evidence line and a short note ever leave the laptop.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const cp = require('child_process');
const readline = require('readline');
const http = require('http');
const https = require('https');

const BUNDLE = __dirname;
const MX = path.join(BUNDLE, '.maxwizer');
const STATE_FILE = path.join(MX, 'state.json');
const QUEUE_FILE = path.join(MX, 'queue.json');
const CERT_AT = 11; // green tasks needed for the certificate (SPEC: 11 of 15)
const EVIDENCE_DIR = path.join(MX, 'evidence');
const CONFIG_FILE = path.join(BUNDLE, 'mw.config.json');
const SAMPLE_SRC = path.join(BUNDLE, 'sample-todo');
const SAMPLE_DIR = path.join(os.homedir(), 'maxwize-sample-todo');
const POST_TIMEOUT_MS = 5000;
const PING_TIMEOUT_MS = 3000;
const INIT_TIMEOUT_MS = 10000;
const INBOX_TIMEOUT_MS = 2000; // the inbox hook runs on every prompt: never hold it up
const INBOX_WAIT_TIMEOUT_MS = 10000; // inbox --wait is already waiting: let a slow reply land
const INBOX_ACK_MAX = 50;
const INBOX_POLL_MS = Number(process.env.MW_INBOX_POLL_MS) || 10000;

// ---------- args ----------
const rawArgs = process.argv.slice(2);
const flags = { yes: false, json: false, context: false, wait: 0 };
const args = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === '--yes' || a === '-y') flags.yes = true;
  else if (a === '--json') flags.json = true;
  else if (a === '--context') flags.context = true;
  else if (a === '--wait') flags.wait = Math.max(0, Number(rawArgs[++i]) || 0);
  else if (a.startsWith('--wait=')) flags.wait = Math.max(0, Number(a.slice(7)) || 0);
  else args.push(a);
}
const cmdName = args.shift() || 'help';

// ---------- small helpers ----------
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
function loadConfig() {
  const c = readJson(CONFIG_FILE, null);
  if (!configOk(c)) die('mw.config.json is missing or incomplete.');
  return c;
}
function configOk(c) {
  return !!c && typeof c === 'object' && !!(c.academy || (c.endpoint && c.batch && c.salt));
}
function endpointConfigured(url) {
  return /^https?:\/\//.test(String(url || '')) && !String(url).includes('REPLACE_ME');
}
// Where this participant's events go: Academy once init stored it, else the legacy Sheet endpoint.
function target(cfg, state) {
  if (state && state.academy) return { events: state.academy + '/api/v1/events', batch: state.batch };
  return { events: cfg.endpoint, batch: cfg.batch };
}
// Non-secret device code Arun matches on the board: first 8 hex of sha256(deviceKey).
function fingerprint(state) {
  return state && state.deviceKey ? sha256(state.deviceKey).slice(0, 8) : '';
}
function pendingLine(state) {
  return `Your new laptop is waiting for Arun's approval on the board. Read him this code: ${fingerprint(state)}`;
}
const UNREGISTERED_LINE = 'This laptop is not registered for this batch. Run node mw.js init again.';
const NOT_APPROVED_LINES = [
  '⛔ Arun has not approved you for this batch yet, so the workshop is paused for you.',
  'You are on his board. Ask him on the Meet to approve you, then try again.',
];
// Why Academy refused an event, as one plain line, or '' when the reason is not the participant's to fix.
function refusalLine(state, r) {
  if (!state || !state.academy) return '';
  if (r.status === 403 && /device_pending/.test(r.body)) return pendingLine(state);
  if (r.status === 403 && /not_approved/.test(r.body)) {
    rememberApproval(state, false);
    return NOT_APPROVED_LINES.join(' ');
  }
  if (r.status === 401) return UNREGISTERED_LINE;
  return '';
}
const announced = new Set();
function announce(line) {
  if (!line || announced.has(line) || flags.json || flags.context) return;
  announced.add(line);
  out(line);
}
function loadState() { return readJson(STATE_FILE, null); }
// Remembers Academy's last word on approval in state.json (re-read first so a concurrent command's changes stay).
function rememberApproval(state, approved) {
  if (!state || state.approved === approved) return;
  state.approved = approved;
  try {
    const fresh = loadState();
    if (fresh && fresh.pid === state.pid) { fresh.approved = approved; saveState(fresh); }
  } catch (e) { /* the next command asks again */ }
}
function saveState(s) { writeJson(STATE_FILE, s); }
function loadQueue() { const q = readJson(QUEUE_FILE, []); return Array.isArray(q) ? q : []; }
function saveQueue(q) { writeJson(QUEUE_FILE, q); }
function die(msg, code) { console.error(msg); process.exit(code === undefined ? 1 : code); }
function out(s) { process.stdout.write(s + '\n'); }
function nowIso() { return new Date().toISOString(); }
function todayLocal(d) {
  const x = d || new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function expandHome(p) { return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p; }
// Strip anything that looks like a path so evidence never leaks one.
function scrub(s) {
  // Removes absolute, home-relative and dot-relative paths; keeps names like feature/csv-export.
  return String(s).replace(/(^|[\s(])(~|\.{1,2})?\/[^\s,;)]*/g, '$1').replace(/[A-Za-z]:\\[^\s,;]*/g, '').replace(/\s+/g, ' ').trim();
}

// ---------- tasks ----------
function loadDay(n) {
  const d = readJson(path.join(BUNDLE, 'days', `day${n}`, 'tasks.json'), null);
  if (!d || !Array.isArray(d.tasks)) return { day: n, tasks: [] };
  d.tasks.forEach((t) => { t.day = n; });
  return d;
}
function allTasks() { return [...loadDay(1).tasks, ...loadDay(2).tasks]; }
function findTask(id) {
  const t = allTasks().find((x) => x.id === id);
  if (!t) die(`Unknown task "${id}". Known tasks: ${allTasks().map((x) => x.id).join(' ')}`);
  return t;
}

// ---------- paths with prefixes ----------
function resolvePath(spec, state) {
  const m = /^([a-z]+):(.*)$/.exec(spec || '');
  if (!m) return path.resolve(BUNDLE, expandHome(spec || '.'));
  const [, prefix, rest] = m;
  const roots = {
    bundle: BUNDLE,
    repo: state && state.repo,
    home: os.homedir(),
    starter: path.join(BUNDLE, 'starter'),
    bughunt: path.join(BUNDLE, 'bughunt'),
  };
  if (!(prefix in roots)) throw new Error(`Unknown path prefix "${prefix}:"`);
  if (!roots[prefix]) throw new Error('No working repo registered. Run: node mw.js init');
  return path.resolve(roots[prefix], rest || '.');
}

// ---------- network ----------
function request(method, url, body, timeoutMs, hops, extraHeaders) {
  hops = hops === undefined ? 0 : hops;
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { return reject(new Error('bad url')); }
    const lib = u.protocol === 'https:' ? https : http;
    const headers = Object.assign({}, extraHeaders || {});
    if (body !== undefined) {
      headers['Content-Type'] = 'text/plain';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = lib.request(u, { method, headers, timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && hops < 4) {
          // Apps Script answers a POST with a redirect to the result; follow it with GET.
          const next = new URL(res.headers.location, u);
          // The device key and ack only go back to the same origin (scheme, host and port).
          const fwd = next.origin === u.origin ? extraHeaders : undefined;
          return request('GET', next.toString(), undefined, timeoutMs, hops + 1, fwd).then(resolve, reject);
        }
        resolve({ status: res.statusCode, body: text });
      });
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function makeEvent(state, cfg, type, extra) {
  const ev = { v: 1, batch: target(cfg, state).batch, pid: state.pid, first: state.first, type, task: '', evidence: '', note: '', ts: nowIso() };
  if (state.deviceKey) ev.key = state.deviceKey;
  if (type === 'register') { ev.name = state.name; ev.email = state.email; ev.phone = state.phone; }
  return Object.assign(ev, extra || {});
}
function enqueue(ev) { const q = loadQueue(); q.push(ev); saveQueue(q); }

// Returns {sent, left, reason, notice}. Stops at the first failure so order is preserved.
// notice: why Academy refused (device pending, not registered); printed once unless `hold` (the caller prints it).
async function flush(cfg, state, quiet, hold) {
  const q = loadQueue();
  if (q.length === 0) return { sent: 0, left: 0 };
  const url = target(cfg, state).events;
  if (!endpointConfigured(url)) return { sent: 0, left: q.length, reason: 'endpoint not configured' };
  let sent = 0;
  while (q.length) {
    try {
      const r = await request('POST', url, JSON.stringify(q[0]), POST_TIMEOUT_MS);
      if (r.status < 200 || r.status >= 300) {
        const notice = refusalLine(state, r);
        if (!hold) announce(notice);
        saveQueue(q);
        return { sent, left: q.length, reason: `http ${r.status}`, notice };
      }
      q.shift(); sent++; saveQueue(q);
    } catch (e) {
      saveQueue(q);
      return { sent, left: q.length, reason: e.message };
    }
  }
  saveQueue(q);
  return { sent, left: 0 };
}
async function ping(cfg, state) {
  const url = target(cfg, state).events;
  if (!endpointConfigured(url)) return 'not configured';
  try {
    const r = await request('GET', url + (url.includes('?') ? '&' : '?') + 'ping=1', undefined, PING_TIMEOUT_MS);
    return r.status >= 200 && r.status < 400 ? 'reachable' : `http ${r.status}`;
  } catch (e) { return 'offline'; }
}

// ---------- prompts ----------
function ask(question, def) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(def ? `${question} [${def}]: ` : `${question}: `, (a) => { rl.close(); resolve((a || '').trim() || def || ''); });
  });
}
async function confirmRun(command) {
  out(`   Command: ${command}`);
  if (flags.yes) return true;
  if (!process.stdin.isTTY) {
    out('   Not an interactive terminal. Re-run with --yes to allow this command.');
    return false;
  }
  const a = await ask('   Run it? [Y/n]', '');
  return a === '' || /^y/i.test(a);
}

// ---------- git helpers ----------
function git(cwd, argv) {
  const r = cp.spawnSync('git', argv, { cwd, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

// Copies the bundled sample todo app to ~/maxwize-sample-todo as a git repo with one commit.
// A copy from an earlier init is kept as it is, with the participant's work in it.
function setupSampleRepo() {
  if (fs.existsSync(path.join(SAMPLE_DIR, '.git'))) return { dir: SAMPLE_DIR, fresh: false };
  if (!fs.existsSync(SAMPLE_SRC)) die('The sample todo app is missing from this bundle. Give the path to one of your own repos instead.');
  if (fs.existsSync(SAMPLE_DIR) && fs.readdirSync(SAMPLE_DIR).length) die(`${SAMPLE_DIR} already exists and is not a git repo. Move it away, or give the path to one of your own repos.`);
  fs.cpSync(SAMPLE_SRC, SAMPLE_DIR, { recursive: true });
  const steps = [
    ['init', '-q'],
    ['symbolic-ref', 'HEAD', 'refs/heads/main'],
    ['add', '-A'],
    ['-c', 'user.name=Maxwize Workshop', '-c', 'user.email=workshop@maxwize.in', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'Sample todo app (TodoMVC, MIT)'],
  ];
  for (const argv of steps) {
    const r = git(SAMPLE_DIR, argv);
    if (!r.ok) die(`Could not make the sample repo a git repo (${r.err || 'git failed'}). Is git installed?`);
  }
  return { dir: SAMPLE_DIR, fresh: true };
}

// ---------- approval ----------
// Asks Academy whether Arun has approved this participant: true, false, or null when it gives no clear answer
// (offline, an older server, a laptop still waiting for device approval). Only an explicit false ever blocks.
async function fetchApproval(state) {
  const url = `${state.academy}/api/v1/events?me=1&batch=${encodeURIComponent(state.batch)}&pid=${encodeURIComponent(state.pid)}`;
  try {
    const r = await request('GET', url, undefined, PING_TIMEOUT_MS, 0, { 'X-MW-Key': state.deviceKey });
    const data = JSON.parse(r.body);
    if (r.status === 200 && data && typeof data.approved === 'boolean') return data.approved;
    if (r.status === 403 && data && data.error === 'not_approved') return false;
  } catch (e) { /* no clear answer */ }
  return null;
}
// True when this participant may use the workshop. Once approved, no more questions: a later refusal from
// Academy (403 not_approved on an event) resets the cache. Legacy (Sheet) participants are never gated.
async function isApproved(state) {
  if (!state || !state.academy) return true;
  if (state.approved === true) return true;
  const answer = await fetchApproval(state);
  if (answer !== null) rememberApproval(state, answer);
  return answer === null ? state.approved !== false : answer;
}
function blockUnapproved() {
  if (flags.context) {
    out('This workshop participant is NOT approved by Arun for this batch yet.');
    out('Do not start or continue any workshop task, /day1 or /day2, and do not run mw check or checkin.');
    out(`Tell them, in your own words: ${NOT_APPROVED_LINES.join(' ')}`);
    process.exit(0);
  }
  if (flags.json) {
    out(JSON.stringify({ error: 'not_approved', message: NOT_APPROVED_LINES.join(' ') }));
    process.exit(3);
  }
  for (const l of NOT_APPROVED_LINES) out(l);
  process.exit(3);
}

// ---------- check runner ----------
// Every check returns {pass, evidence, reason?}. Evidence never contains a path.
async function runCheck(check, state) {
  const type = check.type;
  const label = check.label || (check.path ? path.basename(check.path.replace(/^[a-z]+:/, '')) : type);
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));
  const fail = (reason) => ({ pass: false, evidence: '', reason });
  const pass = (evidence) => ({ pass: true, evidence: scrub(evidence) });

  if (type === 'state') {
    if (state[check.key]) return pass(check.evidence || `${check.key} set`);
    return fail(`${check.key} is not set`);
  }

  if (type === 'file') {
    const p = resolvePath(check.path, state);
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) return fail(`${label} not found`);
    const text = fs.readFileSync(p, 'utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '').length;
    if (check.minLines && lines < check.minLines) return fail(`${label} has ${lines} non-empty lines, needs ${check.minLines}`);
    for (const s of check.contains || []) if (!text.includes(s)) return fail(`${label} does not contain "${s}"`);
    for (const s of check.notContains || []) if (text.includes(s)) return fail(`${label} still contains "${s}"`);
    let edited = '';
    if (check.editedAfterInit) {
      const created = Date.parse(state.createdAt || 0);
      if (!(fs.statSync(p).mtimeMs > created)) return fail(`${label} was not edited after mw init`);
      edited = ', edited';
    }
    const ev = check.evidence ? fill(check.evidence, { lines, label }) : `${label} ${lines} lines${edited}`;
    return pass(ev);
  }

  if (type === 'executable') {
    const p = resolvePath(check.path, state);
    if (!fs.existsSync(p)) return fail(`${label} not found`);
    const st = fs.statSync(p);
    if (!(st.mode & 0o111)) return fail(`${label} is not executable (chmod +x)`);
    if (check.contains && !fs.readFileSync(p, 'utf8').includes(check.contains)) return fail(`${label} does not contain "${check.contains}"`);
    return pass(check.evidence || `${label} active`);
  }

  if (type === 'cmd') {
    const cwd = resolvePath(check.cwd || 'bundle:', state);
    if (!fs.existsSync(cwd)) return fail(`folder for "${check.cmd}" not found`);
    if (check.ask !== false) {
      const okToRun = await confirmRun(check.cmd);
      if (!okToRun) return fail('command not run');
    }
    const r = cp.spawnSync(check.cmd, { cwd, shell: true, encoding: 'utf8', timeout: (check.timeoutSec || 120) * 1000, env: Object.assign({}, process.env, { CI: '1', FORCE_COLOR: '0' }) });
    const output = ((r.stdout || '') + (r.stderr || '')).trim();
    if (r.status !== 0) {
      const tail = output.split('\n').slice(-15).join('\n');
      if (tail) out('   ' + tail.replace(/\n/g, '\n   '));
      return fail(r.error && r.error.code === 'ETIMEDOUT' ? `"${check.cmd}" timed out` : `"${check.cmd}" exited with code ${r.status === null ? 'signal' : r.status}`);
    }
    let ev = check.evidence || `${check.cmd} ok`;
    const firstLine = (output.split('\n').find((l) => l.trim()) || 'ok').trim().slice(0, 40);
    const ver = (output.match(/\d+\.\d+(\.\d+)?/) || ['?'])[0];
    ev = ev.replace('$stdout', firstLine).replace('{version}', ver);
    return pass(ev);
  }

  if (type === 'git') {
    const cwd = resolvePath(check.cwd || 'bundle:', state);
    if (!fs.existsSync(cwd)) return fail('folder not found');
    const top = git(cwd, ['rev-parse', '--show-toplevel']);
    if (!top.ok) return fail('not a git repo yet (run git init inside it)');
    if (fs.realpathSync(top.out) !== fs.realpathSync(cwd)) return fail('this folder is not its own git repo yet (run git init inside it, not in the parent)');
    const parts = [];
    const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).out || '';
    if (check.branchNot) {
      const banned = [].concat(check.branchNot);
      if (!branch || banned.includes(branch)) return fail(`still on branch "${branch || '?'}"; create a feature branch`);
      parts.push(`branch ${branch}`);
    }
    if (check.minCommitsAhead) {
      let base = null;
      for (const b of ['main', 'master']) if (git(cwd, ['rev-parse', '--verify', '--quiet', b]).ok) { base = b; break; }
      let ahead = 0;
      if (base && base !== branch) {
        const r = git(cwd, ['rev-list', '--count', `${base}..HEAD`]);
        ahead = r.ok ? parseInt(r.out, 10) || 0 : 0;
      }
      if (ahead < check.minCommitsAhead) return fail(`${ahead} commits ahead of ${base || 'main'}, needs ${check.minCommitsAhead}`);
      parts.push(`${ahead} commit${ahead === 1 ? '' : 's'}`);
    }
    if (check.remoteContains || check.remoteNotContains) {
      const remotes = git(cwd, ['remote', '-v']).out;
      if (!remotes) return fail('no git remote set (git remote add origin <your github url>)');
      if (check.remoteContains && !remotes.includes(check.remoteContains)) return fail(`remote does not point to ${check.remoteContains}`);
      // Judge the owner/repo part: everything after "github.com" when present, else the whole url.
      const owners = remotes.split('\n').map((l) => { const u = (l.split(/\s+/)[1] || '').toLowerCase(); const i = u.indexOf('github.com'); return i >= 0 ? u.slice(i) : u; });
      for (const bad of [].concat(check.remoteNotContains || [])) if (owners.some((o) => o.includes(bad.toLowerCase()))) return fail(`remote still points at "${bad}"; push to your OWN account`);
      parts.push('remote ok');
    }
    if (check.pushed) {
      const up = git(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
      if (!up.ok) return fail('branch has no upstream; push with git push -u origin <branch>');
      const sb = git(cwd, ['status', '-sb']).out.split('\n')[0] || '';
      if (/\bahead\b/.test(sb)) return fail('local commits not pushed yet (git push)');
      parts.push('pushed');
    }
    if (check.minTrackedFiles) {
      const n = git(cwd, ['ls-files']).out.split('\n').filter(Boolean).length;
      if (n < check.minTrackedFiles) return fail(`${n} tracked files, needs ${check.minTrackedFiles}`);
      parts.push(`${n} files tracked`);
    }
    return pass(check.evidence || parts.join(', ') || 'git ok');
  }

  if (type === 'count') {
    const p = resolvePath(check.path, state);
    const data = readJson(p, null);
    if (data === null) return fail(`${label} missing or not valid JSON`);
    const arr = (check.jsonPath || '').split('.').filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), data);
    const n = Array.isArray(arr) ? arr.length : 0;
    if (n < check.min) return fail(`${n} entries, needs ${check.min}`);
    return pass(check.evidence || `${n} entries`);
  }

  if (type === 'hashes') {
    const p = resolvePath(check.path, state);
    const hp = resolvePath(check.hashesFile, state);
    const found = readJson(p, null);
    if (found === null) return fail(`${label} missing or not valid JSON`);
    const hf = readJson(hp, null);
    if (!hf || !Array.isArray(hf.hashes)) return fail('answer hashes file missing; run git pull in the bundle');
    const list = Array.isArray(found.found) ? found.found : Array.isArray(found) ? found : [];
    const keys = new Set(list.map((e) => (e && typeof e === 'object' ? e.key : e)).filter(Boolean).map((k) => String(k).trim().toLowerCase()));
    const hashes = new Set(hf.hashes);
    let hits = 0;
    for (const k of keys) if (hashes.has(sha256(hf.salt + k))) hits++;
    const total = hf.hashes.length;
    if (hits < check.min) return fail(`${hits} of ${total} correct, needs ${check.min}`);
    return pass(check.evidence || `${hits} of ${total} found`);
  }

  if (type === 'http') {
    try {
      const r = await request('GET', check.url, undefined, (check.timeoutSec || 5) * 1000);
      if (r.status !== 200) return fail(`GET returned ${r.status}`);
      if (check.contains && !r.body.includes(check.contains)) return fail(`response does not contain "${check.contains}"`);
      return pass(check.evidence || 'http ok');
    } catch (e) { return fail(`could not reach url (${e.message})`); }
  }

  if (type === 'all') {
    const evs = [];
    for (const sub of check.checks || []) {
      const r = await runCheck(sub, state);
      if (!r.pass) return r;
      evs.push(r.evidence);
    }
    return pass(check.evidence || evs.join('; '));
  }

  return fail(`unknown check type "${type}"`);
}

// ---------- status helpers ----------
function taskState(state, id) { return (state.tasks && state.tasks[id]) || { status: 'todo' }; }
function icon(st) { return st.status === 'pass' ? '✅' : st.status === 'stuck' ? '🟠' : '⏳'; }
function greens(state, tasks) { return tasks.filter((t) => taskState(state, t.id).status === 'pass').length; }
function nextTask(state, tasks) { return tasks.find((t) => taskState(state, t.id).status !== 'pass') || null; }
function fmtLine(state, t) {
  const st = taskState(state, t.id);
  let s = `${icon(st)} ${t.id}  ${t.title}`;
  if (st.status === 'pass' && st.evidence) s += `  —  ${st.evidence}`;
  if (st.status === 'stuck' && st.note) s += `  —  stuck: ${st.note}`;
  return s;
}

// ---------- commands ----------
// Looks up the batch code on Academy; returns {batch, salt, course}. Dies with a plain sentence on failure.
async function fetchBatch(cfg, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) die('A batch code is required. Ask Arun for it.');
  const base = cfg.academy.replace(/\/+$/, '');
  let r;
  try { r = await request('GET', `${base}/api/v1/batches/${encodeURIComponent(code)}`, undefined, INIT_TIMEOUT_MS); }
  catch (e) { die('Could not reach Maxwize Academy. Connect to the internet and run init again.'); }
  if (r.status === 404) die(`Batch code ${code} not found. Check the code Arun shared.`);
  let data = null;
  try { data = JSON.parse(r.body); } catch (e) { /* handled below */ }
  if (r.status !== 200 || !data || !data.batch || !data.salt) die('Maxwize Academy did not answer as expected. Try again in a minute.');
  return { batch: String(data.batch), salt: String(data.salt), course: data.course || null };
}

async function cmdInit(cfg) {
  const prev = loadState() || {};
  const env = process.env;
  // A participant registered on the old Sheet keeps that path unchanged; everyone else joins via Academy.
  const academyMode = !!cfg.academy && !(prev.pid && !prev.academy);
  const nonInteractive = env.MW_NAME && env.MW_EMAIL && env.MW_PHONE && env.MW_REPO && (!academyMode || env.MW_BATCH_CODE);
  let name, email, phone, repo, info = null;
  if (nonInteractive) {
    name = env.MW_NAME; email = env.MW_EMAIL; phone = env.MW_PHONE; repo = env.MW_REPO;
    if (academyMode) info = await fetchBatch(cfg, env.MW_BATCH_CODE);
  } else {
    if (!process.stdin.isTTY) die(`No terminal. Set MW_NAME, MW_EMAIL, MW_PHONE, MW_REPO${academyMode ? ', MW_BATCH_CODE' : ''} or run in a terminal.`);
    out(`Welcome to the Claude Code workshop. ${academyMode ? 'Five' : 'Four'} quick questions.`);
    if (academyMode) info = await fetchBatch(cfg, await ask('Batch code (from Arun)', prev.academy && prev.batch));
    name = await ask('Your name', prev.name);
    email = await ask('Email (the one you registered with)', prev.email);
    phone = await ask('WhatsApp number', prev.phone);
    repo = await ask('Path to a repo of yours to practise on (must contain .git). No repo? Press Enter for a sample todo app', prev.repo);
  }
  name = String(name).trim(); email = String(email).trim().toLowerCase(); phone = String(phone).trim();
  if (!name) die('Name is required.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) die(`"${email}" does not look like an email.`);
  if (!/^\+?[\d\s-]{8,15}$/.test(phone)) die(`"${phone}" does not look like a phone number.`);
  // No path (or MW_REPO=sample): practise on the bundled sample todo app.
  let sample = null;
  repo = String(repo || '').trim();
  if (!repo || repo.toLowerCase() === 'sample') {
    sample = setupSampleRepo();
    repo = sample.dir;
  }
  repo = path.resolve(expandHome(repo));
  if (!fs.existsSync(repo) || !fs.statSync(repo).isDirectory()) die(`Repo folder not found: ${repo}`);
  if (!fs.existsSync(path.join(repo, '.git'))) die(`${repo} has no .git folder. Pick a git repo (or run git init there first).`);
  if (fs.realpathSync(repo) === fs.realpathSync(BUNDLE)) die('Pick one of YOUR repos, not this bundle.');

  const state = {
    pid: sha256(email + (info ? info.salt : cfg.salt)).slice(0, 8),
    name, first: name.split(/\s+/)[0], email, phone, repo,
    batch: info ? info.batch : cfg.batch,
    createdAt: prev.createdAt || nowIso(),
    tasks: prev.tasks || {},
    days30: prev.days30 || {},
    start30: prev.start30 || null,
  };
  if (info) {
    state.academy = cfg.academy.replace(/\/+$/, '');
    state.salt = info.salt;
    state.course = info.course;
    // Same batch on the same laptop keeps its key; a new batch or a fresh folder gets a new one.
    state.deviceKey = prev.academy && prev.batch === info.batch && prev.deviceKey ? prev.deviceKey : crypto.randomBytes(32).toString('hex');
  }
  saveState(state);
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const reg = makeEvent(state, cfg, 'register', { note: prev.pid ? 'update' : '' });
  if (state.academy) {
    // Events queued for another pid or batch would be refused forever and block the queue: drop them,
    // and send the register first so the events kept behind it are accepted.
    const q = loadQueue().filter((e) => e && e.pid === state.pid && e.batch === state.batch);
    q.unshift(reg);
    saveQueue(q);
  } else enqueue(reg);
  const f = await flush(cfg, state, true);
  out(`\n✅ Registered as ${state.first} (id ${state.pid}). Practice repo: ${path.basename(repo)}.`);
  if (state.academy) out(`Device code: ${fingerprint(state)}  (Arun may ask you to read it out)`);
  if (f.left) out(`⏳ Hello message queued (${f.reason}); it will be sent on the next command with network.`);
  if (sample) {
    out(`\n📁 No repo given, so you will practise on a sample todo app${sample.fresh ? '' : ' (your earlier copy, kept as it is)'}:`);
    out(`   ${sample.dir}`);
    out('   Open a NEW terminal tab and go there:');
    out(`     cd "${sample.dir}"`);
    out('   Use that tab whenever a task says "your repo" (run  claude  there for tasks 1.3 to 1.5).');
    out('   To see the app, open index.html from that folder in your browser.');
    out('   Keep THIS tab for /day1 and the check-ins.');
  }
  if (state.academy && !f.left && !(await isApproved(state))) {
    out('\n⏸  You are registered, but Arun has not approved you for this batch yet.');
    out('   You are on his board. Ask him on the Meet to approve you; until then the workshop tasks stay locked.');
    out('   After he approves you, run  claude  in this folder and type  /day1');
    return;
  }
  out('\nNext: run  claude  in this folder and type  /day1');
  out('      (or by hand: node mw.js checkin 1.1)');
}

async function cmdStatus(cfg, state) {
  const tasks = allTasks();
  const queue = loadQueue();
  const nx = nextTask(state, tasks);
  const stuck = tasks.filter((t) => taskState(state, t.id).status === 'stuck');
  if (flags.json) {
    out(JSON.stringify({
      pid: state.pid, first: state.first, batch: state.batch, createdAt: state.createdAt,
      tasks: tasks.map((t) => Object.assign({ id: t.id, day: t.day, hour: t.hour, title: t.title, minutes: t.minutes, next: t.next }, taskState(state, t.id))),
      green: greens(state, tasks), total: tasks.length, certificateAt: CERT_AT,
      next: nx ? nx.id : null, stuck: stuck.map((t) => t.id), queue: queue.length,
      start30: state.start30 && state.start30.startedAt || null,
    }, null, 2));
    return;
  }
  if (flags.context) {
    const d1 = loadDay(1).tasks, d2 = loadDay(2).tasks;
    out(`Workshop participant: ${state.first} (id ${state.pid}, batch ${state.batch}).`);
    if (state.academy) out(`Device code: ${fingerprint(state)} (Arun may ask the participant to read it out).`);
    out(`Bundle folder (local only, never sent): ${BUNDLE}`);
    out(`Day 1: ${greens(state, d1)}/${d1.length} green. Day 2: ${greens(state, d2)}/${d2.length} green. Certificate at ${CERT_AT}/${tasks.length}.`);
    out(nx ? `Next task: ${nx.id} ${nx.title} (day ${nx.day}, hour ${nx.hour}, ~${nx.minutes} min).` : `All ${tasks.length} tasks green. Nothing left to check in.`);
    out(stuck.length ? `Stuck: ${stuck.map((t) => t.id).join(', ')} (Arun notified).` : 'Stuck: none.');
    out(`Queued check-ins not yet sent: ${queue.length}.`);
    if (state.start30 && state.start30.startedAt) {
      const p30 = progress30(state);
      out(`30 days: day ${p30.day} of 30, ${p30.done} of ${p30.due} items done so far (${p30.total} in all); use /today.`);
    }
    out('Guide: /day1 or /day2 walks the tasks; /status explains; /stuck when blocked.');
    out('Checks: node mw.js check <id>  then  node mw.js checkin <id>  (add --yes when the check runs a command).');
    out('Privacy: never put file contents, code or paths into any mw command or note.');
    return;
  }
  out(`${state.first}  (id ${state.pid}, batch ${state.batch})`);
  if (state.academy) out(`Device code: ${fingerprint(state)}`);
  for (const day of [1, 2]) {
    const d = loadDay(day);
    out(`\nDay ${day}`);
    let hour = null;
    for (const t of d.tasks) {
      if (t.hour !== hour) { hour = t.hour; out(`  Hour ${hour}`); }
      out('   ' + fmtLine(state, t));
    }
  }
  const reach = await ping(cfg, state);
  out(`\nGreen: ${greens(state, tasks)}/${tasks.length}  (certificate at ${CERT_AT})`);
  if (state.start30 && state.start30.startedAt) {
    const p30 = progress30(state);
    out(`30 days: day ${p30.day} of 30, ${p30.done} of ${p30.due} items done so far (${p30.total} in all). Morning command: node mw.js today`);
  }
  if (nx) out(`Next:  ${nx.id} ${nx.title}  →  node mw.js check ${nx.id}`);
  out(`Queue: ${queue.length} pending  |  Endpoint: ${reach}`);
}

async function cmdCheck(cfg, state, record) {
  const id = args[0];
  if (!id) die(`Usage: node mw.js ${record ? 'checkin' : 'check'} <task id>   e.g. 1.3`);
  const t = findTask(id);
  let r;
  try { r = await runCheck(t.check, state); } catch (e) { r = { pass: false, evidence: '', reason: e.message }; }
  if (flags.json) { out(JSON.stringify({ id, title: t.title, pass: r.pass, evidence: r.evidence, reason: r.reason || '', hint: r.pass ? '' : t.hint })); }
  else if (r.pass) out(`✅ PASS ${id} ${t.title}  —  ${r.evidence}`);
  else { out(`❌ FAIL ${id} ${t.title}  —  ${r.reason}`); out(`💡 ${t.hint}`); }
  if (!r.pass) process.exit(1);
  if (!record) return;

  const was = taskState(state, id);
  state.tasks = state.tasks || {};
  state.tasks[id] = { status: 'pass', evidence: r.evidence, at: nowIso() };
  saveState(state);
  enqueue(makeEvent(state, cfg, 'pass', { task: id, evidence: r.evidence, note: was.status === 'stuck' ? 'was stuck' : '' }));
  const nx = t.next ? allTasks().find((x) => x.id === t.next) : null;
  const total = allTasks().length;
  if (!flags.json) {
    out(`🎉 ${id} checked in. ${greens(state, allTasks())}/${total} green.`);
    if (nx) out(`Next: ${nx.id} ${nx.title} (~${nx.minutes} min)  →  node mw.js check ${nx.id}`);
    else if (t.day === 1) out('Day 1 done. See you tomorrow: type /day2.');
    else out('All tasks done. Run: node mw.js start30');
  }
}

async function cmdStuck(cfg, state) {
  const id = args[0];
  const note = String(args.slice(1).join(' ') || '').trim().slice(0, 140);
  if (!id || !note) die('Usage: node mw.js stuck <task id> "<one line, max 140 chars>"');
  const t = findTask(id);
  const was = taskState(state, id);
  if (was.status === 'pass') { out(`${id} is already green. Nothing to report.`); return; }
  state.tasks = state.tasks || {};
  state.tasks[id] = { status: 'stuck', note, at: nowIso() };
  saveState(state);
  enqueue(makeEvent(state, cfg, 'stuck', { task: id, note }));
  const f = await flush(cfg, state, true, true);
  out(`🟠 Stuck on ${id} ${t.title}: "${note}"`);
  if (!f.left) out('Arun has been notified.');
  else if (f.notice) { announced.add(f.notice); out(`⏳ Not sent yet. ${f.notice}`); }
  else out('⏳ Saved offline; Arun will be notified when you are back online.');
  return true; // already flushed
}

function load30() {
  const plan = readJson(path.join(BUNDLE, 'days', '30', 'plan.json'), null);
  return plan && typeof plan === 'object' ? plan : null;
}
// 30-day progress: items due up to today vs items marked done.
function progress30(state) {
  const plan = load30() || {};
  const day = Math.min(30, Math.max(0, dayNumber(state.start30.startedAt)));
  let due = 0, total = 0, done = 0;
  for (const [key, d] of Object.entries(plan)) {
    const n = parseInt(key.slice(1), 10);
    const items = d.items || [];
    total += items.length;
    if (n <= day) due += items.length;
    const flags = (state.days30 && state.days30[key]) || {};
    done += items.filter((it) => flags[it.id.slice(-1)]).length;
  }
  return { day, due, total, done };
}

function dayNumber(startedAt) {
  // Weekdays only. Day 1 = first Mon–Fri on or after the start date.
  const start = new Date(startedAt + 'T00:00:00');
  const today = new Date(todayLocal() + 'T00:00:00');
  let n = 0;
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}
async function cmdStart30(cfg, state) {
  if (state.start30 && state.start30.startedAt && !flags.yes) {
    out(`30 days already started on ${state.start30.startedAt}. Add --yes to restart from today.`);
    return;
  }
  state.start30 = { startedAt: todayLocal() };
  saveState(state);
  enqueue(makeEvent(state, cfg, 'start30', { note: state.start30.startedAt }));
  out(`🚀 30 days start today (${state.start30.startedAt}). Every weekday morning: node mw.js today`);
}
async function cmdToday(cfg, state) {
  if (!state.start30 || !state.start30.startedAt) die('30-day plan not started. Run: node mw.js start30');
  const plan = load30();
  if (!plan) die('days/30/plan.json is missing. Run git pull in the bundle.');
  let n = dayNumber(state.start30.startedAt);
  const wd = new Date().getDay();
  if (n < 1) { out('Your first item is on Monday. Rest today.'); return; }
  if (n > 30) { out('All 30 days are behind you. Run: node mw.js status'); return; }
  const key = 'd' + String(n).padStart(2, '0');
  const day = plan[key];
  if (!day) die(`No plan entry for ${key}.`);
  const done = (state.days30 && state.days30[key]) || {};
  const items = day.items || [];
  const allDone = items.length && items.every((it) => done[it.id.slice(-1)]);
  out(`Day ${n} of 30${wd === 0 || wd === 6 ? ' (weekend, no pressure)' : ''}: ${day.title}${allDone ? '  ✅' : ''}`);
  for (const it of items) out(`  ${done[it.id.slice(-1)] ? '✅' : '⬜'} ${it.id}  [${it.kind}] ${it.text}`);
  if (!allDone) out(`\nAfter each item: node mw.js done <id>   (details: days/30/${key}.md)`);
}
async function cmdDone(cfg, state) {
  const itemId = String(args[0] || '').toLowerCase();
  const m = /^(d\d{2})([a-z])$/.exec(itemId);
  if (!m) die('Usage: node mw.js done <itemId>   e.g. d03a');
  const [, key, letter] = m;
  const plan = load30();
  if (plan && !(plan[key] && (plan[key].items || []).some((it) => it.id === itemId))) die(`Unknown item "${itemId}". Run: node mw.js today`);
  state.days30 = state.days30 || {};
  state.days30[key] = state.days30[key] || {};
  const already = state.days30[key][letter];
  state.days30[key][letter] = true;
  saveState(state);
  if (!already) enqueue(makeEvent(state, cfg, 'done30', { task: itemId }));
  out(`✅ ${itemId} done${already ? ' (already was)' : ''}.`);
}

async function cmdSync(cfg, state) {
  const before = loadQueue().length;
  if (!before) { out('Queue empty. Nothing to sync.'); return true; }
  const f = await flush(cfg, state);
  if (f.left) out(`⏳ Sent ${f.sent}, ${f.left} still queued (${f.reason}).`);
  else out(`✅ Sent ${f.sent} queued event${f.sent === 1 ? '' : 's'}.`);
  return true;
}

async function cmdBoard(cfg, state) {
  const t = target(cfg, state);
  if (!endpointConfigured(t.events)) die('Endpoint not configured in mw.config.json.');
  let r;
  try {
    if (state && state.academy) {
      const q = `board=1&batch=${encodeURIComponent(t.batch)}&pid=${encodeURIComponent(state.pid)}`;
      r = await request('GET', `${t.events}?${q}`, undefined, 10000, 0, { 'X-MW-Key': state.deviceKey || '' });
      if (r.status === 403) die(pendingLine(state));
    } else {
      r = await request('GET', t.events + (t.events.includes('?') ? '&' : '?') + 'board=1', undefined, 10000);
    }
  }
  catch (e) { die(`Could not reach endpoint (${e.message}).`); }
  let data;
  try { data = JSON.parse(r.body); } catch (e) { die(`Endpoint did not return JSON (http ${r.status}).`); }
  if (flags.json) { out(JSON.stringify(data, null, 2)); return; }
  const rows = Array.isArray(data) ? data : Array.isArray(data.board) ? data.board : Array.isArray(data.rows) ? data.rows : [];
  if (!rows.length) { out('Board is empty.'); return; }
  // Known shape from the dashboard: {tasks:[ids], rows:[{first, tasks:{id:'pass'|'stuck'}, lastSeen}], counts:{id:{pass,stuck}}}
  if (Array.isArray(data.tasks) && rows[0] && rows[0].tasks && typeof rows[0].tasks === 'object') {
    const ids = data.tasks;
    const mark = (v) => (v === 'pass' ? '✅' : v === 'stuck' ? '🟠' : '· ');
    out(['name'.padEnd(10), ...ids.map((t) => t.padEnd(3))].join(' '));
    rows.forEach((r) => out([String(r.first || r.name || '').slice(0, 10).padEnd(10), ...ids.map((t) => mark(r.tasks[t]).padEnd(3))].join(' ')));
    if (data.counts) {
      out('');
      out(['cohort ✅'.padEnd(10), ...ids.map((t) => String((data.counts[t] || {}).pass || 0).padEnd(3))].join(' '));
      out(['cohort 🟠'.padEnd(10), ...ids.map((t) => String((data.counts[t] || {}).stuck || 0).padEnd(3))].join(' '));
    }
    return;
  }
  const cols = Array.isArray(rows[0]) ? null : [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const table = cols ? [cols, ...rows.map((r) => cols.map((c) => r[c]))] : rows;
  const cell = (v) => (v === null || v === undefined ? '' : String(v)).slice(0, 22);
  const widths = [];
  table.forEach((row) => row.forEach((v, i) => { widths[i] = Math.max(widths[i] || 0, [...cell(v)].length); }));
  table.forEach((row, ri) => {
    out(row.map((v, i) => cell(v) + ' '.repeat(Math.max(0, widths[i] - [...cell(v)].length))).join('  '));
    if (ri === 0 && cols) out(widths.map((w) => '-'.repeat(w)).join('  '));
  });
}

// ---------- inbox ----------
// Runs as a Claude Code hook on every prompt: it must print nothing and exit 0 on any problem, and never touch stderr.
function clean(s) { return String(s === undefined || s === null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').replace(/\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim(); }

// One poll. Returns {ok, messages:[...]} or {pending:true}; anything else is {}. ok means a 200 that cleared the ack.
// Hook path: hard 2 s cap even against a slow drip. --wait path: 10 s per request, no cap.
async function fetchInbox(state, ack, waiting) {
  const url = `${state.academy}/api/v1/inbox?batch=${encodeURIComponent(state.batch)}&pid=${encodeURIComponent(state.pid)}`;
  const headers = { 'X-MW-Key': state.deviceKey };
  if (ack.length) headers['X-MW-Ack'] = ack.join(',');
  const timeoutMs = waiting ? INBOX_WAIT_TIMEOUT_MS : INBOX_TIMEOUT_MS;
  let timer;
  const cap = waiting ? null : new Promise((resolve) => { timer = setTimeout(() => resolve(null), INBOX_TIMEOUT_MS); });
  try {
    const req = request('GET', url, undefined, timeoutMs, 0, headers).catch(() => null);
    const r = await (cap ? Promise.race([req, cap]) : req);
    if (!r) return {};
    const data = JSON.parse(r.body);
    if (r.status === 403 && data && data.error === 'device_pending') return { pending: true };
    if (r.status === 200 && data && Array.isArray(data.messages)) {
      return { ok: true, messages: data.messages, approved: typeof data.approved === 'boolean' ? data.approved : null };
    }
  } catch (e) { /* silent by design */ }
  finally { clearTimeout(timer); }
  return {};
}
// The ids mw printed, acknowledged on the next poll. Re-read state.json first so a concurrent command's
// changes (a checkin during inbox --wait) are kept; only inboxAck is written.
function loadAck(state) {
  const a = state && Array.isArray(state.inboxAck) ? state.inboxAck : [];
  return a.filter((x) => Number.isInteger(x) && x > 0).slice(-INBOX_ACK_MAX);
}
function saveAck(ack) {
  try {
    const fresh = loadState();
    if (!fresh || !fresh.pid) return;
    fresh.inboxAck = ack;
    saveState(fresh);
  } catch (e) { /* silent by design */ }
}
function printMessages(messages) {
  let n = 0;
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue;
    const body = clean(m.body);
    if (!body || (m.kind !== 'note' && m.kind !== 'instruction')) continue;
    const from = clean(m.from) || 'Arun';
    out(m.kind === 'instruction' ? `Instruction from ${from} for Claude: ${body}` : `${from} says: ${body}`);
    n++;
  }
  return n;
}
// Returns true when Academy (or the remembered answer, if it did not reply) says this participant is not approved.
async function cmdInbox(state, waitSec) {
  if (!state || !state.academy || !state.pid || !state.batch || !/^[0-9a-f]{64}$/.test(String(state.deviceKey))) return false;
  const waiting = waitSec > 0;
  const deadline = Date.now() + Math.max(0, waitSec) * 1000;
  let ack = loadAck(state);
  let said = false;
  for (;;) {
    const r = await fetchInbox(state, ack, waiting);
    if (r.pending && !said) { said = true; out(pendingLine(state)); }
    if (r.ok && r.approved !== null) rememberApproval(state, r.approved);
    if (r.ok) {
      // Print first, then remember: a crash in between costs a duplicate print, never a lost reply.
      const printed = printMessages(r.messages);
      const ids = r.messages.map((m) => m && m.id).filter((x) => Number.isInteger(x) && x > 0);
      if (ack.length || ids.length) { ack = ids.slice(-INBOX_ACK_MAX); saveAck(ack); }
      if (printed > 0) return state.approved === false;
    }
    const left = deadline - Date.now();
    if (left <= 0) return state.approved === false;
    await new Promise((resolve) => setTimeout(resolve, Math.min(INBOX_POLL_MS, left)));
  }
}

function usage() {
  out(`mw — your workshop companion (node mw.js <command>)

  init                  register: name, email, phone, path to your own repo
  status                all tasks with ✅ ⏳ 🟠, queue size, endpoint  (--json, --context)
  check <id>            run the check for a task, never records       (--yes to run commands)
  checkin <id>          check, and if it passes record it and tell Arun
  stuck <id> "<note>"   tell Arun you are stuck (note max 140 chars)
  start30               start your 30-day plan (Hour 4)
  today                 today's 30-day items
  done <itemId>         mark a 30-day item done, e.g. d03a
  sync                  send queued check-ins now
  inbox [--wait N]      read Arun's replies (--wait N: keep checking up to N seconds)
  board                 (Arun) print the cohort board

Alias: alias mw="node $(pwd)/mw.js"   or   npm link
Nothing but task id, pass/stuck, one evidence line and your note ever leaves this laptop.`);
}

// ---------- main ----------
(async () => {
  if (['help', '--help', '-h'].includes(cmdName)) { usage(); return; }
  if (cmdName === 'inbox') {
    try {
      const c = readJson(CONFIG_FILE, null);
      const st = readJson(STATE_FILE, null);
      // On the UserPromptSubmit hook, exit 2 makes Claude Code drop the prompt and show stderr: an unapproved
      // participant cannot go on with /day1, /day2 or anything else in this folder.
      if (configOk(c) && (await cmdInbox(st, flags.wait))) {
        if (flags.wait) out(NOT_APPROVED_LINES.join(' '));
        else { process.stderr.write(NOT_APPROVED_LINES.join('\n') + '\n'); process.exit(2); }
      }
    } catch (e) { /* silent by design */ }
    process.exit(0);
  }
  const cfg = loadConfig();
  if (cmdName === 'init') { await cmdInit(cfg); return; }
  if (cmdName === 'board') { await cmdBoard(cfg, loadState()); return; }
  const known = ['status', 'check', 'checkin', 'stuck', 'today', 'done', 'start30', 'sync'];
  if (!known.includes(cmdName)) { out(`Unknown command "${cmdName}".\n`); usage(); process.exit(1); }
  const state = loadState();
  if (!state || !state.pid) {
    if (flags.context) { out('No workshop participant registered yet in this bundle.'); out('Ask the participant to run: node mw.js init'); return; }
    die('Run: node mw.js init');
  }
  if (cmdName !== 'sync' && !(await isApproved(state))) blockUnapproved();
  let flushed = false;
  switch (cmdName) {
    case 'status': await cmdStatus(cfg, state); break;
    case 'check': await cmdCheck(cfg, state, false); break;
    case 'checkin': await cmdCheck(cfg, state, true); break;
    case 'stuck': flushed = await cmdStuck(cfg, state); break;
    case 'today': await cmdToday(cfg, state); break;
    case 'done': await cmdDone(cfg, state); break;
    case 'start30': await cmdStart30(cfg, state); break;
    case 'sync': flushed = await cmdSync(cfg, state); break;
  }
  if (!flushed && !flags.json) {
    const f = await flush(cfg, state, true);
    if (f.sent && !flags.context) out(`(synced ${f.sent} queued event${f.sent === 1 ? '' : 's'})`);
  } else if (!flushed && flags.json) {
    await flush(cfg, state, true);
  }
})().catch((e) => { console.error(e && e.message ? e.message : e); process.exit(1); });
