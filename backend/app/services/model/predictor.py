"""Prediksi memakai MobileNetV2.

Fungsi di sini yang dipakai `services/pipeline.py` dan route `/predict`.
`model_is_ready()` sudah berfungsi nyata: ia hanya mengecek apakah file bobot
ada di disk. Yang belum ada adalah pemuatan model dan perhitungannya.
"""

import numpy as np
from pathlib import Path

from PIL import Image

from tensorflow.keras.preprocessing import image as k_image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

from app.core.config import settings
from app.schemas.prediction import ColorAnalysis, PredictionResponse


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
    from tensorflow.keras.models import load_model

    return load_model(settings.MODEL_PATH)


def predict_proba(model, image: Image.Image) -> dict[str, float]:
    """Hitung nilai keyakinan model untuk setiap kelas.

    Args:
        model: Model hasil `load_model`.
        image: Citra tomat hasil segmentasi.

    Returns:
        Dictionary {nama_kelas: nilai_keyakinan}, jumlah nilainya 1.0.
    """
    # Resize sesuai IMAGE_SIZE dari config
    img = image.resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE))

    # Convert ke array (RGB -> float32)
    img_array = k_image.img_to_array(img)

    # Tambahkan batch dimension: shape (1, H, W, 3)
    img_array = np.expand_dims(img_array, axis=0)

    # Preprocessing MobileNetV2 (normalisasi ke [-1, 1])
    img_array = preprocess_input(img_array)

    # Prediksi probabilitas
    preds = model.predict(img_array, verbose=0)[0]  # shape: (3,)

    # Map ke dict {class_name: probability}
    probs: dict[str, float] = {}
    for name, prob in zip(settings.CLASS_NAMES, preds):
        probs[name] = float(prob)

    return probs


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
    model = load_model()
    probs = predict_proba(model, image)

    # Ambil kelas dengan probabilitas tertinggi
    best_class = max(probs, key=probs.get)
    confidence = probs[best_class]

    return PredictionResponse(
        label=best_class,
        confidence=confidence,
        probabilities=probs,
        color_analysis=color_analysis,
    )