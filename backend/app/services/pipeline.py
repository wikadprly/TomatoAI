"""Pipeline end-to-end: gambar -> citra ternarya -> MobileNetV2 -> label.

Modul ini hanya merangkai urutan tahap. Logika tiap tahap ada di:
- `services/image_processing/` (Tim 1)
- `services/model/` (Tim 2)
"""

from app.core.config import settings
from app.schemas.prediction import PredictionResponse
from app.services.image_processing.preprocessing import load_image_from_bytes
from app.services.model.predictor import model_is_ready, predict_label


class ModelNotReadyError(RuntimeError):
    """Bobot MobileNetV2 belum tersedia sehingga prediksi tidak bisa dijalankan."""


def classify_tomato(image_bytes: bytes) -> PredictionResponse:
    """Jalankan seluruh pipeline klasifikasi untuk satu gambar.

    Args:
        image_bytes: isi file gambar hasil upload pengguna.

    Returns:
        Hasil klasifikasi beserta confidence score.

    Raises:
        ModelNotReadyError: bila bobot MobileNetV2 belum ada di disk.
        NotImplementedError: bila modul Tim 1 atau Tim 2 belum diisi.
    """
    if not model_is_ready():
        raise ModelNotReadyError(
            f"Model belum siap. Bobot tidak ditemukan di {settings.MODEL_PATH}. "
            "Tim 2 perlu menyelesaikan training/fine-tuning MobileNetV2 terlebih dahulu."
        )

    image = load_image_from_bytes(image_bytes)
    return predict_label(image)