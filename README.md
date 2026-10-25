# Claude Code workshop (Tamil batch): participant bundle

Everything you touch during the two days lives in this folder.

## 60-second start

```bash
git clone https://github.com/Maxwize-in/Claude-Code-Workshop.git
cd Claude-Code-Workshop
node mw.js init        # batch code from Arun, name, email, WhatsApp number, path to one of your own git repos (Enter = sample todo app)
claude                 # start Claude Code in this folder
/day1                  # Claude walks you through Day 1, task by task
```

Day 2: open `claude` in this folder and type `/day2`. Any time: `/status` or `node mw.js status`.

## What `mw` is

`mw.js` is a tiny companion CLI (plain Node 18+, no install). It knows the workshop tasks,
runs the check for each one (`node mw.js check 1.3`), and records a pass only when the check
is green (`node mw.js checkin 1.3`). `node mw.js status` always tells you what is next.
`node mw.js stuck 2.2 "tests fail after rebase"` tells Arun you need help, and
`node mw.js inbox` (add `--wait 180` to wait up to 3 minutes) shows his reply.

Shorter command, pick one:

```bash
alias mw="node $(pwd)/mw.js"     # this shell only; or add to ~/.zshrc
npm link                         # gives you `mw` everywhere
```

## Privacy promise

- Only the task id, pass/stuck, one short evidence line (like "CLAUDE.md 34 lines") and your note ever leave your laptop.
- Never file contents, never code, never a path. Your name, email and phone are sent once, at `init`, so Arun can see who is who.
- All local state is in `.maxwizer/` (gitignored). Delete that folder and you are gone.

## Troubleshooting

- `Run: node mw.js init` on every command: you have not registered yet, or you are in the wrong folder.
- `claude: command not found`: `npm install -g @anthropic-ai/claude-code`, then open a new terminal.
- Check says FAIL: read the 💡 hint line; fix; run `node mw.js check <id>` again. Nothing is recorded until it passes.
- Offline or endpoint unreachable: check-ins are saved in `.maxwizer/queue.json` and sent by the next command with network, or `node mw.js sync`.
- Something else: `/stuck` inside Claude Code, or `node mw.js stuck <id> "<one line>"`. Arun gets an email.
