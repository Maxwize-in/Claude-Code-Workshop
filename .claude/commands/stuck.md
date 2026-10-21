I am stuck on the current task. Arguments (optional): task id and a short note. $ARGUMENTS

1. If no task id was given, run `node mw.js status --json` and take the `next` task.
2. Give me exactly ONE hint: the single most likely fix, in 3 lines or fewer. Do not retry things for me.
3. Write a one-line note (max 140 characters) describing the problem. No file contents, no code, no paths.
4. Run `node mw.js stuck <id> "<note>"`.
5. Tell me: "Arun has been notified. Try the hint; if it works, say `check in <id>` and I will run the check-in."
