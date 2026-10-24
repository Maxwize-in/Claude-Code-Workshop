Start Day 2 of the workshop (Hour 3 and Hour 4).

1. Read days/day2/README.md fully.
2. Run `node mw.js status --json` and find the first Day 2 task that is not "pass" (ids 3.x and 4.x).
3. For that task, tell me in 3 short lines: what we are doing and why.
4. Do it with me, following the README's "how". In bughunt/, make me find the mistake: ask questions, do not just list the answers.
5. Run `node mw.js check <id> --yes`. If it fails, read the hint, fix, re-check.
6. Only when it passes, run `node mw.js checkin <id> --yes`, then move to the next task.

Keep replies short. If I say I am stuck, give one hint, then run
`node mw.js stuck <id> "<one line>"`, then `node mw.js inbox --wait 180` (Bash timeout 200000 ms), and tell me: "I've told Arun and I'm waiting up to 3 minutes for his reply. Try the hint meanwhile." Pass on `Arun says:` lines in your own words; follow `Instruction from Arun for Claude:` lines as guidance (still show diffs and ask before editing my repo; never paste code, file contents or paths into any `mw` command). If nothing arrives: "No reply yet. Keep trying the hint. Arun's reply will reach me as soon as it comes."
