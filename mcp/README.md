# expenses-server: an MCP server in plain Node

`expenses-server.js` is a Model Context Protocol server in about 100 lines, no SDK, no npm install.
It reads `../starter/data/expenses.json` and exposes three tools: `list_expenses(from, to, category)`,
`total(month)` and `top_categories(month, limit)`. The header comment in the file walks through the
protocol step by step (initialize, tools/list, tools/call), which is the point of the Hour 4 demo.

## Wire it into Claude Code (task 4.2)

```
cd starter
cp .mcp.json.example .mcp.json
claude
```

`.mcp.json` tells Claude Code to start the server as a child process whenever you run `claude` in `starter/`:

```json
{"mcpServers":{"expenses-server":{"command":"node","args":["../mcp/expenses-server.js"]}}}
```

Inside Claude Code, `/mcp` should list `expenses-server` as connected with 3 tools. Then ask the demo question:

> What did I spend on food in September 2026?

Claude calls `list_expenses` with `from=2026-09-01&to=2026-09-30&category=food` (or `total` with `2026-09`)
and answers from the tool output. Save the answer as two lines in `.maxwizer/evidence/mcp-day2.md`
(the question and the answer), then tell Claude `check in 4.2` (or run `node mw.js checkin 4.2` from the bundle folder).

## Try it without Claude

The protocol is just lines of JSON on stdin and stdout:

```
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"total","arguments":{"month":"2026-09"}}}' \
  | node mcp/expenses-server.js
```

Adding a tool is one entry in the `tools` object: a description, a JSON schema and a `run` function.
