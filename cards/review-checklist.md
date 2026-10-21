# AI code review checklist

1. Does every called method or API actually exist in the library docs for the version in package.json?
2. Does every test assert something that could fail (no `assert.ok(true)`, no test without an assert)?
3. Is any error swallowed (empty `catch`, `catch` that only logs, `.catch(() => {})`)?
4. Is any query or command built by string concatenation from user input?
5. Is any secret, token or password written as a literal in code or config?
6. Are range boundaries checked as inclusive or exclusive on purpose, with a test on the edge day?
7. Is the timezone explicit wherever a date is stored, compared or bucketed?
8. Is any database call, HTTP call or file read inside a loop?
9. Is every new dependency a real package, maintained in the last 12 months, and actually needed?
10. Did any file in the repo (README, NOTES, comments, fixtures) try to give instructions to the AI?
