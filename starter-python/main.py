import re
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import store

app = FastAPI(title="Expense tracker API")

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def is_valid_date(s: Any) -> bool:
    """'2026-09-05' and nothing else (rejects 2026-13-45, 2026-9-5, timestamps, ...)."""
    if not isinstance(s, str) or not DATE_RE.match(s):
        return False
    try:
        return date.fromisoformat(s).isoformat() == s
    except ValueError:
        return False


def is_valid_month(s: Any) -> bool:
    return isinstance(s, str) and MONTH_RE.match(s) is not None


def bad_request(message: str) -> JSONResponse:
    return JSONResponse({"error": message}, status_code=400)


@app.get("/health")
def health():
    return {"status": "ok"}


# GET /expenses?from=YYYY-MM-DD&to=YYYY-MM-DD&category=food  (all optional, range inclusive)
@app.get("/expenses")
def list_expenses(request: Request):
    q = request.query_params
    rows = store.read_all()
    if q.get("from"):
        rows = [r for r in rows if r["date"] >= q["from"]]
    if q.get("to"):
        rows = [r for r in rows if r["date"] <= q["to"]]
    if q.get("category"):
        rows = [r for r in rows if r["category"] == q["category"]]
    return rows


# GET /expenses/summary?month=YYYY-MM  -> { month, total, byCategory }
@app.get("/expenses/summary")
def summary(month: str | None = None):
    if not is_valid_month(month):
        return bad_request("month must be YYYY-MM")
    rows = [r for r in store.read_all() if r["date"].startswith(month + "-")]
    by_category: dict[str, int] = {}
    for r in rows:
        by_category[r["category"]] = by_category.get(r["category"], 0) + r["amount"]
    return {"month": month, "total": sum(r["amount"] for r in rows), "byCategory": by_category}


# POST /expenses  { date, amount, category, note? }
@app.post("/expenses", status_code=201)
async def create_expense(request: Request):
    try:
        body = await request.json()
    except ValueError:
        body = {}
    if not isinstance(body, dict):
        body = {}
    errors = []
    if not is_valid_date(body.get("date")):
        errors.append("date must be YYYY-MM-DD")
    amount = body.get("amount")
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or not amount > 0:
        errors.append("amount must be a number > 0")
    category = body.get("category")
    if not isinstance(category, str) or category.strip() == "":
        errors.append("category is required")
    if errors:
        return bad_request("; ".join(errors))
    note = body.get("note")
    return store.add(
        {
            "date": body["date"],
            "category": category.strip(),
            "amount": amount,
            "note": note if isinstance(note, str) else "",
        }
    )


# --- routes end ---

# Static page last so it never shadows the API routes
app.mount("/", StaticFiles(directory=Path(__file__).parent / "public", html=True), name="public")
