"""Smoke test: memastikan aplikasi FastAPI bisa dimuat dan route health jalan."""

from fastapi.testclient import TestClient

from app.api.routes import predict as predict_route
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


def test_predict_menolak_file_kosong() -> None:
    response = client.post(
        "/api/v1/predict",
        files={"file": ("kosong.jpg", b"", "image/jpeg")},
    )
    assert response.status_code == 400


def test_predict_menolak_file_melebihi_batas() -> None:
    response = client.post(
        "/api/v1/predict",
        files={"file": ("besar.jpg", b"x" * (6 * 1024 * 1024), "image/jpeg")},
    )
    assert response.status_code == 413


def test_predict_mengembalikan_503_bila_dependency_ml_absen(monkeypatch) -> None:
    """TensorFlow belum terpasang harus jadi 503 yang jelas, bukan 500."""

    def dependency_absen(image_bytes: bytes):
        raise ImportError("No module named 'tensorflow'")

    monkeypatch.setattr(predict_route, "classify_tomato", dependency_absen)

    response = client.post(
        "/api/v1/predict",
        files={"file": ("t.jpg", b"isi-citra", "image/jpeg")},
    )

    assert response.status_code == 503
    assert "requirements-ml.txt" in response.json()["detail"]