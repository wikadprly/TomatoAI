"""Test integrasi pipeline: segmentasi + analisis warna tersambung ke prediksi.

Model prediksi ditiru (monkeypatch) supaya test tidak butuh TensorFlow.
Membutuhkan numpy + opencv-python; di mesin tanpa keduanya test di-skip.
"""

from io import BytesIO

import pytest

pytest.importorskip("cv2", reason="opencv-python tidak terpasang")
pytest.importorskip("numpy", reason="numpy tidak terpasang")

from PIL import Image, ImageDraw

from app.schemas.prediction import PredictionResponse
from app.services import pipeline


def _bytes_gambar_lingkaran_merah(size: int = 224) -> bytes:
    citra = Image.new("RGB", (size, size), (240, 240, 240))
    gambar = ImageDraw.Draw(citra)
    margin = size // 4
    gambar.ellipse([margin, margin, size - margin, size - margin], fill=(220, 30, 30))
    buffer = BytesIO()
    citra.save(buffer, format="PNG")
    return buffer.getvalue()


def test_classify_tomato_mengisi_color_analysis(monkeypatch):
    monkeypatch.setattr(pipeline, "model_is_ready", lambda: True)

    def predict_tiruan(image, color_analysis=None, mask=None):
        assert mask is not None
        return PredictionResponse(
            label="matang",
            confidence=0.9,
            probabilities={"matang": 0.9},
            color_analysis=color_analysis,
        )

    monkeypatch.setattr(pipeline, "predict_label", predict_tiruan)

    hasil = pipeline.classify_tomato(_bytes_gambar_lingkaran_merah())

    assert hasil.label == "matang"
    assert hasil.color_analysis is not None
    assert hasil.color_analysis.object_ratio > 0


def test_classify_tomato_menyertakan_artefak_segmentasi(monkeypatch):
    """Frontend butuh visual mask + citra input model untuk ditampilkan."""
    monkeypatch.setattr(pipeline, "model_is_ready", lambda: True)

    def predict_tiruan(image, color_analysis=None, mask=None):
        return PredictionResponse(
            label="matang",
            confidence=0.9,
            probabilities={"matang": 0.9},
            color_analysis=color_analysis,
        )

    monkeypatch.setattr(pipeline, "predict_label", predict_tiruan)

    hasil = pipeline.classify_tomato(_bytes_gambar_lingkaran_merah())

    assert hasil.segmentation is not None
    assert hasil.segmentation.overlay_jpeg.startswith("data:image/jpeg;base64,")
    assert hasil.shape_metrics is not None
    assert hasil.shape_metrics.circularity > 0.5


def test_artefak_segmentasi_bisa_dimatikan(monkeypatch):
    monkeypatch.setattr(pipeline, "model_is_ready", lambda: True)
    monkeypatch.setattr(pipeline.settings, "SEGMENTATION_IMAGES_ENABLED", False)
    monkeypatch.setattr(
        pipeline,
        "predict_label",
        lambda image, color_analysis=None, mask=None: PredictionResponse(
            label="mentah",
            confidence=0.8,
            probabilities={"mentah": 0.8},
            color_analysis=color_analysis,
        ),
    )

    hasil = pipeline.classify_tomato(_bytes_gambar_lingkaran_merah())
    assert hasil.segmentation is None


def test_classify_tomato_menolak_saat_model_belum_siap(monkeypatch):
    monkeypatch.setattr(pipeline, "model_is_ready", lambda: False)

    with pytest.raises(pipeline.ModelNotReadyError):
        pipeline.classify_tomato(_bytes_gambar_lingkaran_merah())
