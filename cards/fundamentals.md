# Claude fundamentals

Ten minutes of reading before Saturday. Arun covers this in six minutes at the start of Hour 1; this page is the version you can come back to.

## What Claude is

| | |
|---|---|
| A model. Text in, text out. | It reads your files and your words as text and writes text back: code, a plan, a diff. It runs nothing on its own; Claude Code asks before it edits a file or runs a command, and `CLAUDE.md` can tighten that. |
| It forgets everything between sessions. | Close the terminal and tomorrow it knows only what is in files. That is why `CLAUDE.md` exists, why a plan is saved as a file, and why "we decided this yesterday" means nothing unless it was written down. |
| Context is its working memory, and your usage limit. | Every file it reads and every answer it writes sits in one window. A full window gives worse answers and reaches the Pro limit sooner. `/clear` after every task; `/compact keep the plan` inside a long one; `/context` shows what is filling it. |

## The five layers, all plain files

| Layer | Question it answers | Where it lives | You build it |
|---|---|---|---|
| Commands | What you type | `cards/command-card.md` | Hour 1 |
| `CLAUDE.md` | What it remembers on every start: how to run tests, what never to touch | `./CLAUDE.md` for the repo, `~/.claude/CLAUDE.md` for you everywhere | Hour 1, tasks 1.3 and 1.4 |
| Skills | What it knows how to do | `.claude/skills/<name>/SKILL.md`, a folder with instructions and optional scripts for one job | Hour 4 |
| Hooks | What it may not do, whatever it thinks | `.git/hooks/pre-commit` (git), `.claude/settings.json` (Claude Code) | Hour 3, task 3.4 |
| MCP and subagents | What it can reach and delegate | `.mcp.json` lists servers; `.claude/agents/<name>.md` defines a subagent | Hour 4, tasks 4.1 and 4.2 |

A skill is only loaded when the task matches its description, so a repo can hold twenty without filling the window. `/skills` lists what is loaded. A subagent is a second Claude with its own window and one job, such as reviewing a diff; it reports back and its reading does not fill your window.

All five are text files in the repo. Git tracks them, your team shares them, Claude reads them on every start. Nothing here is a setting hidden in an app.

## The eight daily commands

`/init` · `/clear` · `/compact <what to keep>` · `/model` · `/help` · `Shift+Tab` (plan mode) · `Esc` (stop) · `/stuck` (ours, Arun gets an email).

The full list with when to use each is in `cards/command-card.md`.

## How this changes the way you work

- Brief, plan, build, check. Plan mode (`Shift+Tab` twice) before anything over ten lines; a rejected plan costs nothing.
- Point, do not paste. `@file` puts the file in the window once; pasting it puts it there twice.
- Write it down or it is gone. Rules in `CLAUDE.md`, decisions in a plan file, a hook for anything that must happen every time.
- Nothing is done until a check says so. In this workshop `node mw.js check` runs the check; in your team, the tests and the hook do.
