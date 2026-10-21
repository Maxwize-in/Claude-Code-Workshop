from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_reports_status_and_version():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "version": "1.0.0"}
