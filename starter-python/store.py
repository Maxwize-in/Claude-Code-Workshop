"""JSON file store. One file, read on every request, written on every change.
Set EXPENSES_FILE to point at a different file (tests use a temp copy)."""
import json
import os
from pathlib import Path

DATA_FILE = Path(os.environ.get("EXPENSES_FILE") or Path(__file__).parent / "data" / "expenses.json")


def read_all() -> list[dict]:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def write_all(rows: list[dict]) -> None:
    DATA_FILE.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")


def next_id(rows: list[dict]) -> str:
    nums = [int(str(r["id"]).lstrip("e")) for r in rows if str(r["id"]).lstrip("e").isdigit()]
    return f"e{(max(nums) if nums else 0) + 1}"


def add(expense: dict) -> dict:
    rows = read_all()
    row = {"id": next_id(rows), **expense}
    rows.append(row)
    write_all(rows)
    return row
