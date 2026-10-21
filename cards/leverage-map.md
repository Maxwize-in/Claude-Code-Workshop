# Your Claude leverage map

Where the work is going, and where to put your own effort.

| What Claude is eating | What is getting more valuable |
|---|---|
| Boilerplate: routes, models, DTOs, config | Specification: writing the brief that makes the first draft right |
| CRUD and glue code | System design: boundaries, data flow, what talks to what |
| Syntax and API recall | Reviewing: spotting the plausible-but-wrong |
| First-draft tests | Debugging: finding the real cause when the obvious fix fails |
| Docs, READMEs, commit messages | Domain knowledge: what the business actually needs |
| Repetitive refactors and renames | Security: injection, secrets, permissions, trust boundaries |
| Reading unfamiliar code to explain it | Judgement: knowing when the answer is "no" or "not yet" |
| Converting between formats and languages | Teaching: making the team better at all of the above |

## The four levers, one line each

- **Skill**: a saved instruction file Claude loads on demand, so a long prompt becomes a short command.
- **Subagent**: a separate Claude with its own context and tools, given one job (for example "review this diff"), reporting back.
- **Hook**: a shell command Claude Code runs automatically before or after an action; exit code 2 blocks the action.
- **MCP**: a small server that gives Claude tools over your data or systems (a database, a browser, an API), in a standard protocol.

## My recurring chores

List the chores you do every week. For each, pick a lever: a skill (a saved prompt you run as `/name`), a subagent (a second Claude with its own job), a hook (a shell command that runs on an event), or MCP (Claude talks to a data source).

| Chore | Hours per week | Lever: skill / subagent / hook / MCP |
|---|---|---|
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |

Pick the top row. That is your Week 4 skill.
