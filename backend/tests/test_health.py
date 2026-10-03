"""Smoke test: memastikan aplikasi FastAPI bisa dimuat dan route health jalan."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["app"] == "TomatoAI API"


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert isinstance(body["model_loaded"], bool)


def test_predict_menolak_format_tidak_didukung() -> None:
    response = client.post(
        "/api/v1/predict",
        files={"file": ("catatan.txt", b"bukan gambar", "text/plain")},
    )
    assert response.status_code == 415