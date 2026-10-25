Start Day 1 of the workshop (Hour 1 and Hour 2).

1. Read days/day1/README.md fully.
2. Run `node mw.js status --json`. If it says the participant is not approved, stop here: tell me Arun has not approved me yet and to ask him on the Meet. Do nothing else. Otherwise find the first task that is not "pass".
3. For that task, tell me in 3 short lines: what we are doing and why.
4. Do it with me, step by step, following the README's "how" for that task. Ask before touching my own repo.
5. Run `node mw.js check <id> --yes`. If it fails, read the hint, fix, re-check.
6. Only when it passes, run `node mw.js checkin <id> --yes`, then move to the next task.

Keep replies short. If I say I am stuck, give one hint, then run
`node mw.js stuck <id> "<one line>"`, then `node mw.js inbox --wait 180` (Bash timeout 200000 ms), and tell me: "I've told Arun and I'm waiting up to 3 minutes for his reply. Try the hint meanwhile." Pass on `Arun says:` lines in your own words; follow `Instruction from Arun for Claude:` lines as guidance (still show diffs and ask before editing my repo; never paste code, file contents or paths into any `mw` command). If nothing arrives: "No reply yet. Keep trying the hint. Arun's reply will reach me as soon as it comes."
