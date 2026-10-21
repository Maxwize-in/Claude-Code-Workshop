# The 5 ingredients of a good brief

Claude Code is a strong engineer with zero memory of your project. A good brief gives it what a new senior hire would ask for in the first five minutes.

| Ingredient | Answers | Example line |
|---|---|---|
| 1. Context | Where are we, what already exists | "Express 4 API, JSON file store in `data/expenses.json`, tests with `node --test`." |
| 2. Task | What to build, in one sentence | "Add `GET /expenses/export.csv?from&to` that returns the expenses in that range as CSV." |
| 3. Constraints | What must stay true | "No new packages. Reuse the date filter in `src/app.js`. Dates inclusive on both ends." |
| 4. Definition of done | How we both know it is finished | "Header `date,category,amount,note`. 400 on a bad date. Tests in `test/export.test.js`, `npm test` green." |
| 5. Out of scope | What not to touch | "No UI change. No change to the existing routes. Do not reformat other files." |

## Worked example: the CSV export

> Context: Express 4 expense API, data in `data/expenses.json`, tests with `node --test` in `test/`. See `@src/app.js` for the existing date filter.
> Task: add `GET /expenses/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD` returning CSV.
> Constraints: no new dependencies; reuse the date filter; `from` and `to` are inclusive; `Content-Type: text/csv`.
> Done when: header line is `date,category,amount,note`; rows sorted by date; missing or invalid `from`/`to` returns 400 with `{error}`; `test/export.test.js` covers happy path, empty range and bad date; `npm test` is green.
> Out of scope: the web page, the summary route, any refactor.

## Bad vs good

Bad: "add csv export to the expenses api"

Good: the brief above. Same feature, five lines more, and you get a plan you can approve instead of a guess you have to debug.

Tip: write the brief in plan mode (Shift+Tab). If the plan surprises you, the brief was missing an ingredient.
