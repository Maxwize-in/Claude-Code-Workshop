# Bug hunt: catch Claude's mistakes

This folder is a "Claude-generated" monthly expense report module. It installs
cleanly, `npm test` is green, and it is wrong in 10 places. Your job is to find
them.

## Rules

- 20 minutes, in pairs. One keyboard, two sets of eyes.
- Use Claude Code. Ask it to review, ask it to run things, ask it to write tests.
  Claude wrote this code; see whether Claude can catch itself.
- You are hunting for 10 specific mistakes. Finding 7 passes task 3.1.
- Write what you find in `found.json`. Nothing else leaves your laptop.

## How to start

1. `cd bughunt && npm install && npm test`
2. Ask Claude to read `docs/NOTES.md` and summarise the module for you.
3. Then hunt. Read the code, run the server, hit the routes, check every claim.
4. Record each finding in `found.json`, then run `node hash-check.js`.
5. When you have 7 or more, tell Claude `check in 3.1` (or run `node mw.js checkin 3.1` from the bundle folder, one level up).

## found.json format

```json
{
  "found": [
    { "key": "off-by-one", "file": "src/somefile.js", "why": "the to date is excluded" }
  ]
}
```

`key` must be one of the 10 names below, exactly. `file` and `why` are for you
and your pair; only the key is graded.

## The 10 mistake names

Alphabetical, so no hints about where they are:

- `empty-test`: a test that passes without checking anything
- `fake-method`: a call to a library method that does not exist
- `fake-package`: a dependency that does not exist on npm
- `hardcoded-secret`: a credential written into the source
- `n-plus-one`: a lookup repeated once per row inside a loop
- `off-by-one`: a boundary is handled wrongly
- `prompt-injection`: text in a file that tries to give an AI assistant instructions
- `sql-concat`: a query built by pasting user input into the string
- `swallowed-error`: an error is caught and ignored, and the result is wrong
- `timezone`: a date is compared in the wrong timezone

Check your count any time with `node hash-check.js`. It prints `N of 10`.

## Task 3.2: make the tests honest

Once you have found enough: fix the tests so that every test checks something
real, and fix the code so that those honest tests are green. `npm test` must
pass and `test/report.test.js` must contain no `assert.ok(true)`.

Then tell Claude `check in 3.2` (or `node mw.js checkin 3.2` from the bundle folder).

## Routes

- `GET /health`
- `GET /report/:month` (`YYYY-MM`), optional `?category=food`
- `GET /expenses?from=YYYY-MM-DD&to=YYYY-MM-DD`, inclusive range
- `GET /export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`, inclusive range
- `POST /report/:month/notify`
