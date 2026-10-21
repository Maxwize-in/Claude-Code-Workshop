#!/usr/bin/env node
// expenses-server.js: an MCP server in ~100 lines of plain Node, no SDK.
//
// How MCP works (the whole protocol, as far as this server needs it):
//  1. Claude Code starts this file as a child process (see .mcp.json) and talks to it
//     over stdin/stdout. One JSON object per line, each a JSON-RPC 2.0 message:
//       request  {"jsonrpc":"2.0","id":1,"method":"...","params":{...}}
//       response {"jsonrpc":"2.0","id":1,"result":{...}}   or   {"id":1,"error":{code,message}}
//       notification: a request without an "id". Never answered.
//  2. Handshake. Claude sends "initialize"; we reply with the protocol version we speak,
//     what we can do (capabilities: tools only here) and our name. Claude then sends the
//     notification "notifications/initialized". We ignore it.
//  3. Discovery. Claude sends "tools/list"; we reply with each tool's name, a plain-English
//     description and a JSON Schema for its arguments. The description is what the model
//     reads to decide when to call the tool, so write it like documentation.
//  4. Use. When the model picks a tool, Claude sends "tools/call" {name, arguments}; we
//     run it and reply {content:[{type:"text",text:"..."}]}. The text goes straight into
//     the model's context, so keep it short and readable. "isError": true marks a failure.
//  5. "ping" gets an empty result. Anything else gets JSON-RPC error -32601 (method not found).
// Nothing here is Claude-specific: any MCP client (Cursor, VS Code, your own script)
// can run this file. stderr is free for logging; stdout is reserved for protocol messages.
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA_FILE = path.join(__dirname, '..', 'starter', 'data', 'expenses.json');
const readAll = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const inr = (n) => '₹' + n.toLocaleString('en-IN');

const tools = {
  list_expenses: {
    description: 'List expenses, optionally filtered by an inclusive date range (YYYY-MM-DD) and/or a category (food, travel, rent, utilities, shopping, health, subscriptions). Returns one line per expense: date, category, amount in INR, note.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date, YYYY-MM-DD, inclusive' },
        to: { type: 'string', description: 'End date, YYYY-MM-DD, inclusive' },
        category: { type: 'string', description: 'Exact category name' },
      },
    },
    run({ from, to, category } = {}) {
      let rows = readAll();
      if (from) rows = rows.filter((r) => r.date >= from);
      if (to) rows = rows.filter((r) => r.date <= to);
      if (category) rows = rows.filter((r) => r.category === category);
      if (!rows.length) return 'No expenses match.';
      const total = rows.reduce((s, r) => s + r.amount, 0);
      return rows.map((r) => `${r.date}  ${r.category.padEnd(13)} ${inr(r.amount).padStart(9)}  ${r.note}`).join('\n') + `\n${rows.length} expenses, total ${inr(total)}`;
    },
  },
  total: {
    description: 'Total spend for one calendar month (YYYY-MM), with a breakdown by category.',
    inputSchema: { type: 'object', properties: { month: { type: 'string', description: 'Month as YYYY-MM, e.g. 2026-09' } }, required: ['month'] },
    run({ month }) {
      if (!/^\d{4}-\d{2}$/.test(month || '')) throw new Error('month must be YYYY-MM');
      const rows = readAll().filter((r) => r.date.startsWith(month + '-'));
      const by = {};
      for (const r of rows) by[r.category] = (by[r.category] || 0) + r.amount;
      const total = rows.reduce((s, r) => s + r.amount, 0);
      const lines = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, a]) => `  ${c.padEnd(13)} ${inr(a).padStart(9)}`);
      return `Total for ${month}: ${inr(total)} across ${rows.length} expenses\n${lines.join('\n')}`;
    },
  },
  top_categories: {
    description: 'The biggest spending categories in a month (YYYY-MM), highest first. limit defaults to 3.',
    inputSchema: { type: 'object', properties: { month: { type: 'string', description: 'Month as YYYY-MM' }, limit: { type: 'integer', minimum: 1, description: 'How many categories to return (default 3)' } }, required: ['month'] },
    run({ month, limit = 3 }) {
      if (!/^\d{4}-\d{2}$/.test(month || '')) throw new Error('month must be YYYY-MM');
      const by = {};
      for (const r of readAll()) if (r.date.startsWith(month + '-')) by[r.category] = (by[r.category] || 0) + r.amount;
      const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, limit);
      if (!top.length) return `No expenses in ${month}.`;
      return `Top ${top.length} categories for ${month}:\n` + top.map(([c, a], i) => `${i + 1}. ${c}: ${inr(a)}`).join('\n');
    },
  },
};

function handle(msg) {
  const { id, method, params = {} } = msg;
  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  switch (method) {
    case 'initialize':
      return reply({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'expenses-server', version: '1.0.0' } });
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: Object.entries(tools).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema })) });
    case 'tools/call': {
      const tool = tools[params.name];
      if (!tool) return reply({ content: [{ type: 'text', text: `Unknown tool: ${params.name}` }], isError: true });
      try {
        return reply({ content: [{ type: 'text', text: tool.run(params.arguments || {}) }] });
      } catch (e) {
        return reply({ content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n'); }
  if (msg.id === undefined) return; // notification (e.g. notifications/initialized): no reply
  process.stdout.write(JSON.stringify(handle(msg)) + '\n');
});
