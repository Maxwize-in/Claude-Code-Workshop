# The 30 days

1. Weekdays only, Monday to Friday. Six calendar weeks, 30 working days. Start with `node mw.js start30` (done in Hour 4).
2. 20 minutes a day, in your own repo. Not the starter.
3. Each day has 2 or 3 items. Each item is one of: Do (in your repo), Read (one page), Share (one line in the WhatsApp group).
4. Every morning: `node mw.js today` shows today's items with their ids. Or type `/today` inside `claude`.
5. After each item: `node mw.js done <id>` (for example `node mw.js done d03b`).
6. Every Friday: post a screenshot of `node mw.js status` in the WhatsApp group. Arun replies to each one.
7. Missed a day? Do not catch up. Do today's items. The habit matters more than the count.
8. Stuck? One line in the group with the day id. Someone in the batch has hit the same wall.
9. Day files `day01.md` to `day30.md` are generated from `plan.json` by `node build-days.js`. Edit `plan.json`, not the day files.
10. Week themes:

| Week | Days | Theme | Friday outcome |
|---|---|---|---|
| 1 | d01–d05 | Brief like a lead | CLAUDE.md in 2 repos, 5 plans saved, 1 feature shipped via plan mode |
| 2 | d06–d10 | The loop, daily | One small feature per day with tests, `/clear` discipline, commit messages Claude writes and you edit |
| 3 | d11–d15 | Catch its mistakes | Review checklist on every PR, 2 hooks live, one "Claude reviews Claude" per day |
| 4 | d16–d20 | Leverage | One skill written, one subagent, MCP on one real data source |
| 5 | d21–d25 | Ship something | An internal tool for your team, built end to end, demoed to your manager (cards/manager-script.md) |
| 6 | d26–d30 | Make it stick | Teach one teammate, write your own command card, book the follow-up Q&A call |
