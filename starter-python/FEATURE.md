# Feature brief: CSV export (FastAPI version)

This brief is written with the five prompt ingredients (Context, Task, Constraints,
Definition of done, Out of scope). Paste it into Claude Code as-is, or use it as the
model for every brief you write from now on.

## Context

This is a small FastAPI expense tracker. `main.py` holds all routes, `store.py` reads and
writes `data/expenses.json` (rows look like
`{ "id": "e5", "date": "2026-09-05", "category": "food", "amount": 320, "note": "Swiggy dinner" }`).
Tests live in `tests/` and run with `pytest` using FastAPI's `TestClient`; `tests/conftest.py`
points the app at a temp copy of the data. Keep that style.

## Task

Add `GET /expenses/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD` that returns every expense in
the date range as a CSV file, ordered by date ascending.

## Constraints

- The range is inclusive on both ends: `from=2026-09-01&to=2026-09-30` includes both days.
- First line is exactly the header `date,category,amount,note`. One row per expense after it, `\n` line endings.
- A note containing a comma, a double quote or a newline is wrapped in double quotes; a
  double quote inside it is doubled (`"`→`""`). Other fields are written as-is. (`csv.writer` with `lineterminator="\n"` does this.)
- `from` and `to` are both required and must be valid `YYYY-MM-DD` dates. Missing or
  invalid → `400` with JSON `{ "error": "<reason>" }`. `from` later than `to` → `400` too.
- Response headers: `Content-Type: text/csv; charset=utf-8` and
  `Content-Disposition: attachment; filename="expenses-<from>-<to>.csv"`
  (for example `expenses-2026-09-01-2026-09-30.csv`).
- An empty range is not an error: return `200` with only the header line.
- Put the route in `main.py` above the `# --- routes end ---` marker (and above the static
  mount), or in a new `export.py` router that `main.py` includes. No new dependencies.

## Definition of done

- `tests/test_export.py` exists with at least 4 tests: happy path (header + row count for
  September), a quoted note with a comma, a 400 case, and the `Content-Disposition` header.
- `pytest` is fully green (fix the health test first if you have not already).
- Work is committed on a branch named `feature/csv-export` with at least one commit.
- `curl "localhost:3000/expenses/export.csv?from=2026-09-01&to=2026-09-30"` shows the header and 18 rows.

## Out of scope

- Filtering by category, pagination, Excel/XLSX, streaming for large files, a download
  button in `public/index.html`, and any change to existing routes or the data file.
