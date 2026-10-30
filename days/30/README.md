# The 30 days

1. Day 1 and Day 2 are the workshop. The 30 days go on with Day 3 to Day 30: 28 small days, four weeks of seven.
2. They open after task 4.3: `node mw.js start30` opens Day 3. Each later day opens as soon as every item of the day before is done. There are no dates: do one day a day, or two on a quiet evening.
3. About 20 minutes a day, in your own repo. Not the starter.
4. Each day has 2 or 3 items. Each item is one of: Do (in your repo), Read (one page), Share (one line in the WhatsApp group).
5. Inside `claude`: `/next` opens your next day. `/day3` to `/day30` open one day (only once it is open). By hand: `node mw.js next`, `node mw.js day 7`.
6. After each item: `node mw.js done <id>` (for example `node mw.js done d03b`). Arun sees your progress on the batch's 30-day board.
7. Stuck? One line in the group with the day id. Someone in the batch has hit the same wall.
8. Day files `day03.md` to `day30.md` and the commands `.claude/commands/day3.md` to `day30.md` are generated from `plan.json` by `node build-days.js`. Edit `plan.json`, not the generated files.
9. The four weeks, easy to advanced:

| Week | Days | Theme | Outcome |
|---|---|---|---|
| 1 | Day 3–9 | The loop, daily | CLAUDE.md in 2 repos, plans saved, 1 feature shipped via plan mode, test first, context under control |
| 2 | Day 10–16 | Catch its mistakes | Five tested features, review checklist on every PR, 2 hooks live, a security pass, your leverage map |
| 3 | Day 17–23 | Leverage | A skill, a subagent, MCP on one real data source, then an internal tool picked, built and run by a teammate |
| 4 | Day 24–30 | Ship it and make it stick | The tool runs itself and is demoed to your manager, one teammate taught, team rules, your own command card |
