# Day 1 (Saturday): Hour 1 and Hour 2

Rhythm every hour: Arun shows for ~10 minutes, you do for ~40, then a 5-minute board check.
Each task ends the same way: tell Claude `check in 1.1` (it runs `node mw.js check 1.1`, and only when that passes `node mw.js checkin 1.1`).
You can also type `node mw.js checkin 1.1` yourself; when a check needs to run a command it asks `Run it? [Y/n]` first.
Inside Claude Code just type `/day1` and it will walk you through this page.
Where this page says `<bundle path>`, it means this folder. Claude already knows it: the line "Bundle folder" is printed when a session starts here, and `node mw.js status --context` prints it again. When Claude asks permission to write a file outside the folder it is running in, say yes; that is the evidence file going into the bundle.

---

## Hour 1: Claude, the way Arun uses it every day

**Arun demos:** which Claude surface he opens for which job (Claude app for thinking and specs, Claude Code in the terminal for building). Then the one lesson: briefing Claude Code like a junior developer, with context, constraints and a definition of done (see `cards/prompt-ingredients.md`). He runs `/init` on a real codebase, edits the `CLAUDE.md` it writes, and shows plan mode and the eight daily commands from `cards/command-card.md`.

**Two terminals for this hour.** Keep this bundle's `claude` open in one tab (it runs `/day1` and the check-ins). Tasks 1.3 to 1.5 happen in your own repo, so open a second tab there and run `claude` in it. When a task is done, come back to the bundle tab and say `check in 1.3`.

### 1.1 Bundle set up (5 min)

**What:** Register yourself with the companion CLI so checks and check-ins work.
You give a path to one of your own repos; Hour 1 tasks happen there. No repo of your own? Press Enter and `mw` sets up a sample todo app at `~/maxwize-sample-todo` for you.
**Why:** Nothing is "done" until a check says so; `mw` is how the room sees progress.
**How:**
1. In this folder: `node mw.js init`
2. Answer: batch code from Arun, name, email you registered with, WhatsApp number, path to one of your own git repos (any small project with a `.git` folder), or press Enter for the sample todo app. If you take the sample, open a new terminal tab and `cd` to the folder `mw` prints; that tab is "your repo" for the day.
3. Start Claude Code here: `claude`, then type `/day1`.
**Check:** `node mw.js check 1.1` then `node mw.js checkin 1.1`

### 1.2 Claude Code answers (5 min)

**What:** Confirm Claude Code is installed and logged in on this laptop.
**Why:** Everything after this needs it; better to find out now than in Hour 2.
**How:**
1. In a terminal: `claude --version` (should print a 2.x version).
2. If missing: `npm install -g @anthropic-ai/claude-code`, open a new terminal, run `claude` once and log in.
3. Inside `claude`, type: `say hello in Tamil` and make sure it answers.
**Check:** `node mw.js check 1.2` (it asks before running `claude --version`) then `node mw.js checkin 1.2`

### 1.3 CLAUDE.md in your own repo (15 min)

**What:** Give your own repo a `CLAUDE.md`: how to run, how to test, what Claude must never touch.
Start from `/init`, then make it yours (20+ lines).
**Why:** `CLAUDE.md` is the brief Claude reads on every session; a good one halves your prompting.
**How:**
1. `cd` into the repo you gave `mw init`, run `claude`.
2. Type `/init` and let Claude explore and write a first draft.
3. Prompt: `Rewrite CLAUDE.md so a new junior developer could start in 10 minutes: how to run, how to test, folder map, 5 rules of things you must never change without asking. Keep it under 60 lines.`
4. Open the file yourself and fix anything wrong. Add one rule only you know (e.g. "payments code: always ask first").
5. Compare with `cards/CLAUDE.md.template` and borrow what is missing.
**Check:** `node mw.js check 1.3` then `node mw.js checkin 1.3`

### 1.4 Personal rules (5 min)

**What:** Create `~/.claude/CLAUDE.md`, rules that follow you into every project (5+ lines).
**Why:** Reply style, commit style and "always ask before X" should not be retyped per repo.
**How:**
1. In Claude Code: `Create ~/.claude/CLAUDE.md with my personal rules: short replies, show a plan before editing more than 2 files, commit messages in imperative mood, never run destructive git commands, ask before adding a dependency.`
2. Read it, change what you disagree with, add one rule of your own.
3. Restart `claude` in any folder and ask `what are my personal rules?` to confirm it loaded.
**Check:** `node mw.js check 1.4` then `node mw.js checkin 1.4`

### 1.5 Plan before code (10 min)

**What:** Use plan mode on a small real change in your repo and save the plan (10+ lines).
Do not build it now; the plan is the deliverable.
**Why:** Plan mode is the single biggest quality lever: you review the approach before any file changes.
**How:**
1. In your repo, run `claude`, press Shift+Tab twice until it says plan mode.
2. Prompt: `I want to <one small change you actually need>. Explore the code and give me a step-by-step plan with the files you will touch and how we will verify it. Do not change anything yet.`
3. Read the plan. Ask one follow-up question (`why that file?` or `what could break?`).
4. Ask Claude: `Save this plan as a markdown file at <bundle path>/.maxwizer/evidence/plan-day1.md` (or copy-paste it there yourself).
5. Exit plan mode without building. You will build it in your 30 days.
**Check:** `node mw.js check 1.5` then `node mw.js checkin 1.5`

---

## Hour 2: You build a real feature with Claude Code

**Arun demos:** on his copy of `starter/`, he builds `GET /expenses/export.csv` end to end, narrating every decision: explore the code, paste the brief from `starter/FEATURE.md`, plan mode, build, `npm test`, review the diff, commit on a feature branch, push. Then you do the same on your laptop. You leave this hour with a commit on your own GitHub.

### 2.1 Starter tests green (5 min)

**What:** Install the starter expense-tracker API, run the tests, fix the one that fails.
Then make `starter/` its own git repo so Hour 2 commits are yours.
**Why:** Explore, fix, verify is the loop you will repeat all day; start it on a one-line bug.
**How:**
1. `cd starter && npm install && npm test`. One test fails on purpose.
2. Run `claude` inside `starter/`. Prompt: `npm test has one failing test. Explore the code, explain in 2 lines why it fails, then fix it with the smallest change and run npm test again.`
3. Read the diff Claude shows before saying yes. Confirm `npm test` is green.
4. Make `starter/` its own repo (once, inside `starter/`):
   ```bash
   git init
   git add -A
   git commit -m "starter: tests green"
   ```
**Check:** `node mw.js check 2.1` (asks before running `npm test`) then `node mw.js checkin 2.1`

### 2.2 CSV export built (30 min)

**What:** Build the feature in `starter/FEATURE.md` on a feature branch, with tests in `test/export.test.js`, all green, committed.
**Why:** This is the whole workflow on a real feature: brief, plan, build, verify, commit.
**How:**
1. Inside `starter/` (the repo you made in 2.1): `git checkout -b feature/csv-export`.
2. Run `claude`, switch to plan mode (Shift+Tab twice). Prompt: `Read FEATURE.md. It is the brief. Explore the code and give me a plan, including the tests you will write in test/export.test.js. Do not build yet.`
3. Review the plan. Push back on anything vague (`how will you handle a bad date?`). Then: `Go ahead, build it, run npm test after.`
4. If tests fail, let Claude fix, but read every diff. Run `npm test` yourself at the end.
5. Ask: `Review your own change against ../cards/review-checklist.md and list anything you would change.` Fix what matters.
6. Commit: `git add -A && git commit -m "Add CSV export for expenses"` (let Claude draft the message, you edit it).
**Check:** `node mw.js check 2.2` then `node mw.js checkin 2.2`

### 2.3 On your own GitHub (10 min)

**What:** Push the feature branch to a repo under your own GitHub account.
**Why:** A commit on your GitHub is the proof you built something today, and Day 2 reviews it.
**How:**
1. On github.com, click the `+` at the top right, then **New repository**. Any name (e.g. `expense-tracker-claude`), Public or Private, no README, no license. Click **Create repository** and copy the HTTPS URL it shows.
2. Inside `starter/`: `git remote add origin https://github.com/<you>/<repo>.git`
3. `git push -u origin feature/csv-export`
   If git asks for a password, GitHub wants a personal access token, not your login password: github.com, Settings, Developer settings, Personal access tokens, Generate new token (repo scope), paste it as the password.
4. Open the branch on GitHub and look at your diff once, as a reviewer would.
**Check:** `node mw.js check 2.3` then `node mw.js checkin 2.3`

Day 1 done. Tomorrow: `claude` in this folder, then `/day2`. Missed something? Day 2 starts at 2.1 if you need it.
