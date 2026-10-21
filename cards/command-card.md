# Claude Code command card

Checked against Claude Code 2.1.306 and the commands reference (docs, "All commands"), October 2026.

## The 8 daily commands

| Command | When to use it |
|---|---|
| `/init` | First time in a repo. Makes a CLAUDE.md; then trim it with `cards/CLAUDE.md.template`. |
| `/clear` | You are switching to an unrelated task. Empty context, fresh start. |
| `/compact <instruction>` | Same task, context getting long. Say what to keep: `/compact keep the plan and the failing tests`. |
| Shift+Tab to plan mode | Anything bigger than a one-line fix. Claude plans, you approve, then it builds. |
| `/model` | Opus for a hard plan, Sonnet for the build, Haiku for trivia. |
| `@file` | Point at the exact file instead of describing it. |
| Esc / Esc Esc | Esc stops a running turn. Esc Esc on an empty prompt opens the rewind menu. |
| `/resume` | Pick up yesterday's session instead of explaining everything again. |

## Full card

| Group | Command | What it does |
|---|---|---|
| Modes | Shift+Tab | Cycles permission modes: Manual, acceptEdits, plan (and auto where available). |
| Modes | plan mode | Claude reads and plans, writes nothing. Approve the plan, then it builds. `/plan <description>` starts it directly. |
| Modes | `/effort low\|medium\|high` | How hard Claude thinks. Low for trivia, high for a tricky plan. |
| Context | `/clear` | New conversation, empty context. `/clear <name>` labels the old one for `/resume`. |
| Context | `/compact <instruction>` | Summarise the conversation so far, keep what you name. |
| Context | `/context` | See what is filling the context window. |
| Context | `@file` | Mention a file or folder; autocomplete helps. |
| Context | `/status` | Version, model, account, connectivity. |
| Models | `/model` | Switch model and save it as default. Sonnet default, Opus for plans, Haiku for trivia. |
| Memory | `/init` | Generate a starting CLAUDE.md for this repo. |
| Memory | `CLAUDE.md` | Project rules, loaded every session. Keep it under 60 lines. |
| Memory | `.claude/rules/*.md` | One topic per file (testing.md, api.md). Can be scoped to paths. |
| Memory | `@path` imports | A line `@docs/conventions.md` inside CLAUDE.md pulls that file in. |
| Memory | `~/.claude/CLAUDE.md` | Your personal rules, every project. |
| Memory | `/memory` | Edit memory files, switch auto memory on or off. |
| Safety | Esc | Stop the current turn. Work done so far is kept. |
| Safety | Esc Esc | Empty prompt: open rewind. With text: clear the draft. |
| Safety | `/rewind` | Go back to an earlier point in conversation or code (also `/undo`). |
| Safety | `/permissions` | Allow, ask, deny rules per tool. Deny `rm -rf` and `git push --force` here. |
| Safety | hooks (`/hooks`) | Shell commands that run on events: run tests after edits, block a dangerous command. |
| Automation | `/loop [interval] <prompt>` | Run a prompt repeatedly while the session is open. |
| Automation | `/background` | Detach this session to keep running, free the terminal. |
| Automation | `/tasks` | See and manage background work and finished subagents. |
| Leverage | `/agents` | Subagents: ask Claude to create one, or edit `.claude/agents/` directly. |
| Leverage | `/mcp` | Connect, reconnect, enable or disable MCP servers (your data sources). |
| Leverage | `/plugin` | Install and manage plugins. |
| Leverage | `/skills` | List skills. A skill is a saved prompt plus files, run as `/name`. |
| Leverage | `/code-review` | Review the current diff or a PR for bugs. |
| Leverage | `/security-review` | Review the branch for injection, auth and data exposure issues. |
| Session | `/resume` | Session picker, or `/resume <name>`. |
| Session | `/fork` | Copy this conversation into a new background session and keep working here. |
| Session | `! command` | Run a shell command yourself; the output goes into the conversation. |

## 8 rules for a full day on the Pro plan

1. Plan in plan mode first. A wrong plan costs one message; a wrong build costs twenty.
2. `/compact` with an instruction, never bare. Say what to keep.
3. Haiku for trivia: renames, one-line questions, commit messages.
4. `/clear` between unrelated tasks. Old context is paid for on every message.
5. Keep CLAUDE.md short. Under 60 lines. Every line is loaded every time.
6. Use skills instead of long prompts. Write the prompt once, run `/name`.
7. Run the checks yourself: `! npm test`, `! git diff`. Do not ask Claude to describe what you can see.
8. Esc a runaway run. If the third attempt is going the wrong way, stop, rewind, re-brief.
