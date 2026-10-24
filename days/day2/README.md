# Day 2 (Sunday): Hour 3 and Hour 4

Same rhythm: Arun shows ~10 minutes, you do ~40, 5-minute board check. Tell Claude `check in 3.1` and it runs the check, then the check-in once it passes (by hand: `node mw.js checkin 3.1`).
Inside Claude Code type `/day2`. Certificate: 11 of 15 tasks green by 6 pm today.
Where this page says `<bundle path>`, it means this folder. Claude already knows it: the line "Bundle folder" is printed when a session starts here, and `node mw.js status --context` prints it again. When Claude asks permission to write a file outside the folder it is running in, say yes; that is the evidence file going into the bundle.

---

## Hour 3: Catch Claude's mistakes

**Arun demos:** `bughunt/` is a "Claude-generated" monthly report module with ten planted AI mistakes: fake functions that look real, tests that pass but test nothing, security holes, a hallucinated package. He finds the first two live, showing the questions he asks Claude and himself. Then the one-page `cards/review-checklist.md` you will use on Monday, how Claude reviews its own work in a fresh session, and a git hook that blocks a bad commit.

### 3.1 Bug hunt: 7 of 10 (20 min)

**What:** Hunt in `bughunt/` (pair up on Google Meet if you can) and record at least 7 of the 10 mistakes in `bughunt/found.json`.
For each one write the key Claude and you agree on from the list in `bughunt/README.md`.
**Why:** Monday you will review AI-written code. You need to know what wrong-but-plausible looks like.
**How:**
1. `cd bughunt`, read `README.md` and `docs/NOTES.md`, then run `claude`.
2. Prompt: `This module was AI-generated. Review it against cards/review-checklist.md, one file at a time, starting with src/report.js. For each suspicious line ask me whether I see the problem before you explain it.`
3. For every mistake you agree on, add `{"key": "<key>", "file": "src/...", "why": "one line"}` to the `found` array in `found.json`.
4. Do not stop at the code: look at the tests, `package.json` and the docs too.
5. Run `node mw.js check 3.1` at any point to see how many are correct so far.
**Check:** `node mw.js check 3.1` then `node mw.js checkin 3.1`

### 3.2 Bug hunt tests honest and green (10 min)

**What:** Replace the test that asserts nothing with a real assertion, fix what it catches, make `npm test` pass.
**Why:** A green test suite that tests nothing is worse than no tests; you learn to read tests, not just their colour.
**How:**
1. In `bughunt/`: `npm install` (it warns about one package it cannot find; that is one of the ten, remove it from `package.json`). Then `npm test`.
2. Prompt: `test/report.test.js has a test that always passes. Rewrite it to assert the real monthly total for September from data/expenses.json, then run npm test.`
3. The test now fails because the code is wrong. Prompt: `Fix the code so the test passes without changing the test. Show me the diff first.`
4. Confirm `npm test` is green and no `assert.ok(true)` remains.
**Check:** `node mw.js check 3.2` then `node mw.js checkin 3.2`

### 3.3 Claude reviews Claude (5 min)

**What:** In a fresh session, make Claude review yesterday's CSV export like a strict reviewer. Save the numbered review (10+ lines, 3+ findings) as `.maxwizer/evidence/review-day2.md` in this bundle.
**Why:** A fresh context has no attachment to the code it wrote; this is the cheapest second pair of eyes you have.
**How:**
1. `cd starter`, run `claude`, type `/clear`.
2. Prompt: `You are a strict reviewer. Review the diff between main and feature/csv-export against ../cards/review-checklist.md. Reply as a numbered list: 1. 2. 3. ... each with severity, file, and the fix. At least 3 findings.`
3. Read it. Disagree with at least one finding out loud, and ask Claude to defend it.
4. Save the list: `Save this review as <bundle path>/.maxwizer/evidence/review-day2.md` (or paste it yourself).
5. Fix the one finding that matters most and commit.
**Check:** `node mw.js check 3.3` then `node mw.js checkin 3.3`

### 3.4 Hook blocks red commits (5 min)

**What:** Add a `pre-commit` git hook in `starter/` that runs `npm test` and refuses the commit when tests fail.
**Why:** Rules in `CLAUDE.md` are advice; a hook is enforcement. Claude cannot commit red code past it.
**How:**
1. Prompt in `starter/`: `Create .git/hooks/pre-commit that runs npm test and exits non-zero if tests fail, and make it executable.`
2. Check it: `cat .git/hooks/pre-commit` and `ls -l .git/hooks/pre-commit` (must show `x`).
3. Break one assertion in a test, `git commit -am "break"`, watch the commit get refused.
4. Undo the break (`git checkout -- test/`), commit something real.
**Check:** `node mw.js check 3.4` then `node mw.js checkin 3.4`

---

## Hour 4: Where Claude is going, and your 30-day plan

**Arun demos:** subagents working in parallel (a reviewer agent that runs in its own context), Claude Code talking to the expense data through MCP (`mcp/expenses-server.js`, plain Node, no SDK: "what did I spend on food in September?"), and Claude in Chrome driving a web page. Which skills are getting more valuable, and where you sit. Then everyone fills a 30-day plan, week by week, before leaving the room. Codex and OpenCode: same workflow, it transfers.

New words this hour: skill, subagent, hook, MCP. One line each in `cards/leverage-map.md`; read that first if any of them is new.

### 4.1 A reviewer subagent (10 min)

**What:** Create `.claude/agents/reviewer.md` in your own repo (5+ lines): a subagent whose only job is reviewing diffs against the checklist.
**Why:** A subagent keeps review in a separate context, so the author never grades its own homework.
**How:**
1. `cd` into your own repo, run `claude`.
2. Prompt: `Create .claude/agents/reviewer.md: a read-only subagent named reviewer that reviews a diff against the 10 points in <bundle path>/cards/review-checklist.md and replies as a numbered list with severity. Include name and description frontmatter.`
3. Read it; cut anything that is not about reviewing.
4. Try it: `Use the reviewer subagent on my last commit.`
**Check:** `node mw.js check 4.1` then `node mw.js checkin 4.1`

### 4.2 MCP answers a data question (15 min)

**What:** Wire the bundled MCP server into `starter/` and get one real answer from your data. Save question and answer as `.maxwizer/evidence/mcp-day2.md` in this bundle (2+ lines).
**Why:** MCP is how Claude Code reaches your databases and internal tools; after today you can wire one yourself.
**How:**
1. `cd starter && cp .mcp.json.example .mcp.json`, then start `claude` (restart if it was open) and approve the `expenses-server` MCP server when asked.
2. Type `/mcp` to confirm it is connected and see its three tools.
3. Prompt: `Using the expenses-server tools: what did I spend on food in September 2026? Show the tool call you made.`
4. Ask one question of your own (top categories, a date range).
5. Save it: `Write my question and your answer to <bundle path>/.maxwizer/evidence/mcp-day2.md` (or paste it yourself).
**Check:** `node mw.js check 4.2` then `node mw.js checkin 4.2`

### 4.3 Your 30-day plan (15 min)

**What:** Fill in `cards/plan-30.template.md` with your repo, your team and your Friday outcomes for Week 1 to Week 4. Save the filled file as `.maxwizer/plan-30.md` in this bundle (12+ lines, headings `Week 1` to `Week 4`).
**Why:** Without a plan, the workshop fades by Wednesday. With one, `mw today` nags you every weekday for 20 minutes.
**How:**
1. Read `cards/plan-30.template.md` and `days/30/README.md` (2 minutes).
2. In this folder, copy the template: `cp cards/plan-30.template.md .maxwizer/plan-30.md` and fill it by hand (your repo names, your teammate's name for Week 6, your manager for Week 5).
3. Optional: ask Claude `Read .maxwizer/plan-30.md and challenge anything vague; ask me 3 questions to sharpen it.`
4. Start the clock: `node mw.js start30`. Every weekday morning from tomorrow: `node mw.js today` or `/today`.
**Check:** `node mw.js check 4.3` then `node mw.js checkin 4.3`

That is every task green. Certificates go out by name on WhatsApp for everyone at 11 or more. Follow-up Q&A call on Day 14; `mw status` screenshot in the group every Friday.
