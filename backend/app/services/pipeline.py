"""Pipeline end-to-end: gambar -> segmentasi -> MobileNetV2 -> label.

Modul ini hanya merangkai urutan tahap. Logika tiap tahap ada di:
- `services/image_processing/`
- `services/model/`
"""

from app.core.config import settings
from app.schemas.prediction import PredictionResponse
from app.services.image_processing.color_analysis import analyze_color
from app.services.image_processing.preprocessing import (
    denoise_image,
    load_image_from_bytes,
)
from app.services.image_processing.segmentation import segment_tomato_with_mask
from app.services.model.predictor import model_is_ready, predict_label


class ModelNotReadyError(RuntimeError):
    """Bobot MobileNetV2 belum tersedia sehingga prediksi tidak bisa dijalankan."""


def classify_tomato(image_bytes: bytes) -> PredictionResponse:
    """Jalankan seluruh pipeline klasifikasi untuk satu gambar.

    Tahapan:
        1. baca & normalisasi ukuran gambar (preprocessing),
        2. kurangi noise (denoise),
        3. segmentasi objek tomat (HSV threshold -> mask -> morfologi),
        4. analisis warna area tomat,
        5. klasifikasi dengan MobileNetV2.

    Args:
        image_bytes: isi file gambar hasil upload pengguna.

    Returns:
        Hasil klasifikasi beserta confidence score dan analisis warna.

    Raises:
        ModelNotReadyError: bila bobot MobileNetV2 belum ada di disk.
    """
    if not model_is_ready():
        raise ModelNotReadyError(
            f"Model belum siap. Bobot tidak ditemukan di {settings.MODEL_PATH}. "
            "Modul model perlu menyelesaikan training/fine-tuning MobileNetV2 terlebih dahulu."
        )

    image = load_image_from_bytes(image_bytes)
    image = denoise_image(image)

    segmented_image, mask, hsv_image = segment_tomato_with_mask(image)
    color_analysis = analyze_color(mask, hsv_image)

    # Bila segmentasi gagal (mask kosong), kirim citra asli ke model supaya
    # tidak menerima gambar hitam semua dan tetap menghasilkan prediksi.
    model_input = segmented_image if color_analysis is not None else image

    return predict_label(model_input, color_analysis=color_analysis)
