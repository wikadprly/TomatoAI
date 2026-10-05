"""Prediksi memakai MobileNetV2.

Fungsi di sini yang dipakai `services/pipeline.py` dan route `/predict`.
`model_is_ready()` sudah berfungsi nyata: ia hanya mengecek apakah file bobot
ada di disk. Yang belum ada adalah pemuatan model dan perhitungannya.
"""

from pathlib import Path

from PIL import Image

from app.core.config import settings
from app.schemas.prediction import ColorAnalysis, PredictionResponse

TODO = "Isi model/predictor.py"


def model_is_ready() -> bool:
    """True bila file bobot MobileNetV2 sudah tersedia di disk."""
    return Path(settings.MODEL_PATH).is_file()


def load_model():
    """Muat model MobileNetV2 yang sudah dilatih.

    Returns:
        Objek model Keras siap menerima input untuk inferensi.

    Raises:
        FileNotFoundError: bila file bobot belum ada.
    """
    if not model_is_ready():
        raise FileNotFoundError(
            f"Bobot model belum tersedia di {settings.MODEL_PATH}."
        )
    raise NotImplementedError(TODO)


def predict_proba(model, image: Image.Image) -> dict[str, float]:
    """Hitung nilai keyakinan model untuk setiap kelas.

    Args:
        model: Model hasil `load_model`.
        image: Citra tomat hasil segmentasi.

    Returns:
        Dictionary {nama_kelas: nilai_keyakinan}, jumlah nilainya 1.0.
    """
    raise NotImplementedError(TODO)


def predict_label(
    image: Image.Image,
    color_analysis: ColorAnalysis | None = None,
) -> PredictionResponse:
    """Klasifikasikan satu citra tomat.

    Ambil kelas dengan nilai keyakinan tertinggi dari `predict_proba`, lalu
    kembalikan sebagai `PredictionResponse` supaya bisa langsung dikirim
    ke frontend.

    Args:
        image: Citra tomat hasil segmentasi.
        color_analysis: Analisis warna dari tahap segmentasi, boleh `None`.

    Returns:
        Hasil klasifikasi beserta confidence score.
    """
    raise NotImplementedError(TODO)