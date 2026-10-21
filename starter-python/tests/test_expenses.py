import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_list_all_rows():
    res = client.get("/expenses")
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) == 60
    assert sorted(rows[0].keys()) == ["amount", "category", "date", "id", "note"]


def test_filter_by_inclusive_date_range():
    res = client.get("/expenses", params={"from": "2026-09-01", "to": "2026-09-30"})
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) == 18
    assert all("2026-09-01" <= r["date"] <= "2026-09-30" for r in rows)


def test_filter_by_category():
    res = client.get("/expenses", params={"category": "rent"})
    rows = res.json()
    assert len(rows) == 3
    assert all(r["category"] == "rent" for r in rows)


def test_post_adds_a_row_with_an_id():
    res = client.post("/expenses", json={"date": "2026-10-21", "amount": 150, "category": "food", "note": "Filter coffee"})
    assert res.status_code == 201
    assert res.json()["id"] == "e61"
    assert res.json()["note"] == "Filter coffee"
    listed = client.get("/expenses", params={"from": "2026-10-21", "to": "2026-10-21"}).json()
    assert len(listed) == 1


@pytest.mark.parametrize(
    "body",
    [
        {"date": "21-10-2026", "amount": 100, "category": "food"},
        {"date": "2026-10-21", "amount": 0, "category": "food"},
        {"date": "2026-10-21", "amount": "100", "category": "food"},
        {"date": "2026-10-21", "amount": 100, "category": ""},
        {"date": "2026-10-21", "amount": 100},
    ],
)
def test_post_rejects_bad_input(body):
    res = client.post("/expenses", json=body)
    assert res.status_code == 400
    assert isinstance(res.json()["error"], str) and res.json()["error"]


def test_summary_totals_a_month_by_category():
    res = client.get("/expenses/summary", params={"month": "2026-09"})
    assert res.status_code == 200
    body = res.json()
    assert body["month"] == "2026-09"
    assert body["total"] == 29257
    assert body["byCategory"]["food"] == 2600
    assert body["byCategory"]["rent"] == 18000
    assert sum(body["byCategory"].values()) == body["total"]


@pytest.mark.parametrize("params", [{}, {"month": "2026"}, {"month": "2026-13"}, {"month": "Sept"}])
def test_summary_rejects_bad_month(params):
    res = client.get("/expenses/summary", params=params)
    assert res.status_code == 400
