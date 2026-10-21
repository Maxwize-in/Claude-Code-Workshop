# Expense tracker API (FastAPI twin of `starter/`)

Same routes, same data, same deliberately failing health test as the Node starter, for
participants who prefer Python. Routes: `GET /health`, `GET /expenses?from&to&category`,
`POST /expenses`, `GET /expenses/summary?month=YYYY-MM`. The page at `public/index.html` is shared.

```
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest                                 # one health test fails on purpose (task 2.1)
uvicorn main:app --reload --port 3000  # http://localhost:3000
```

Feature brief: `FEATURE.md` (Hour 2: `GET /expenses/export.csv?from&to`, task 2.2).
The `mw` checks for 2.1 and 2.2 run `npm test` in `starter/`, so if you work here, tell Arun
on the board and run `pytest` for your own check; the workflow with Claude Code is identical.

## Hour 2 setup

```
cd starter-python && git init && git add -A && git commit -m init && git checkout -b feature/csv-export
```
