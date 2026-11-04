"""Test predictor: urutan label, guard, dan kasus kelas bukan_tomat.

Model dan probabilitas ditiru (monkeypatch) supaya test tidak butuh bobot
TensorFlow maupun file .keras.
"""

import pytest

pytest.importorskip("numpy", reason="numpy tidak terpasang")
pytest.importorskip("PIL", reason="pillow tidak terpasang")

from PIL import Image

from app.services.model import predictor
from app.services.tomato_guard import NotATomatoError


def _citra() -> Image.Image:
    return Image.new("RGB", (224, 224), (200, 40, 40))


def _pasang_model(monkeypatch, probs: dict[str, float]) -> None:
    monkeypatch.setattr(predictor, "load_model", lambda: object())
    monkeypatch.setattr(
        predictor, "predict_proba", lambda model, image: dict(probs)
    )


def test_predict_label_bukan_tomat_tanpa_mask(monkeypatch):
    """bukan_tomat harus tetap dikembalikan walau mask None (guard dilewati)."""
    _pasang_model(
        monkeypatch,
        {"mentah": 0.05, "setengah_matang": 0.05, "matang": 0.10, "bukan_tomat": 0.80},
    )

    hasil = predictor.predict_label(_citra(), mask=None)

    assert hasil.label == "bukan_tomat"
    assert hasil.confidence == pytest.approx(0.80)
    assert set(hasil.probabilities) == {
        "mentah",
        "setengah_matang",
        "matang",
        "bukan_tomat",
    }


def test_predict_label_tetap_ditolak_mask_kosong(monkeypatch):
    """Tanpa kelas bukan_tomat teratas, mask kosong tetap memicu 422."""
    _pasang_model(
        monkeypatch,
        {"mentah": 0.05, "setengah_matang": 0.10, "matang": 0.85, "bukan_tomat": 0.00},
    )

    with pytest.raises(NotATomatoError):
        predictor.predict_label(_citra(), mask=None)


def test_predict_label_pilih_kelas_tertinggi(monkeypatch):
    # Guard dimatikan agar fokus hanya pada pemilihan kelas teratas.
    from app.core.config import settings

    monkeypatch.setattr(settings, "TOMATO_GUARD_ENABLED", False)
    _pasang_model(
        monkeypatch,
        {"mentah": 0.10, "setengah_matang": 0.75, "matang": 0.14, "bukan_tomat": 0.01},
    )

    hasil = predictor.predict_label(_citra(), mask=None)

    assert hasil.label == "setengah_matang"
    assert hasil.confidence == pytest.approx(0.75)
