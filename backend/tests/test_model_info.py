"""Test endpoint metrik model dan turunan precision/recall per kelas."""

import json

from fastapi.testclient import TestClient

from app.main import app
from app.services.model.metrics import _per_class_metrics, load_model_info

client = TestClient(app)


def test_model_info_tersedia() -> None:
    response = client.get("/api/v1/model/info")

    assert response.status_code == 200
    body = response.json()
    assert 0.0 <= body["accuracy"] <= 1.0
    assert body["test_set_size"] > 0
    assert len(body["confusion_matrix"]) == len(body["class_names"])
    assert body["per_class"]


def test_model_info_tidak_membocorkan_path_absolut() -> None:
    """metrics.json menyimpan path absolut mesin; jangan pernah dikirim."""
    body = load_model_info()
    assert "/" not in body.model_name
    assert "\\" not in body.model_name


def test_per_class_metrics_matang_dihitung_benar() -> None:
    matrix = [
        [10, 0],
        [2, 8],
    ]
    metrics = _per_class_metrics(["a", "b"], matrix)

    # Kelas b: TP=8, diprediksi 8, aktual 10 -> precision 1.0, recall 0.8
    assert metrics[1].precision == 1.0
    assert metrics[1].recall == 0.8
    assert metrics[1].support == 10


def test_model_info_membalas_503_tanpa_file_metrik(monkeypatch, tmp_path) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "METRICS_PATH", tmp_path / "tidak-ada.json")
    response = client.get("/api/v1/model/info")
    assert response.status_code == 503
    assert "metrik" in response.json()["detail"].lower()


def test_metrics_file_format_json_valid() -> None:
    """Sanity check file metrik yang dibawa repo."""
    from app.core.config import settings

    with open(settings.METRICS_PATH, encoding="utf-8") as handle:
        data = json.load(handle)
    assert data["class_names"][-1] == "bukan_tomat"
