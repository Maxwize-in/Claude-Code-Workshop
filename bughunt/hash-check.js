#!/usr/bin/env node
// Prints how many entries in found.json are among the 10 planted mistakes.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const read = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
const { salt, hashes } = read('.hashes.json');
const found = (read('found.json').found || []).map((e) => (typeof e === 'string' ? e : e.key));
const hash = (key) => crypto.createHash('sha256').update(salt + String(key || '').trim().toLowerCase()).digest('hex');
const hits = new Set(found.map(hash).filter((h) => hashes.includes(h)));
console.log(`${hits.size} of ${hashes.length}`);
process.exit(hits.size >= 7 ? 0 : 1);
