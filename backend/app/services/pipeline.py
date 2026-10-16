"""Pipeline end-to-end: gambar -> segmentasi -> MobileNetV2 -> label.

Modul ini hanya merangkai urutan tahap. Logika tiap tahap ada di:
- `services/image_processing/`
- `services/model/`

Catatan penting: model dilatih pada citra tomat asli (background disertakan,
hanya rescale 1/255, tanpa denoise maupun segmentasi). Karena itu model
menerima citra asli yang sudah di-resize, BUKAN hasil segmentasi (background
hitam). Segmentasi tetap dijalankan untuk menghasilkan `ColorAnalysis` sebagai
metadata pendukung, namun tidak menggantikan input model.
"""

from app.core.config import settings
from app.schemas.prediction import PredictionResponse
from app.services.image_processing.color_analysis import analyze_color
from app.services.image_processing.preprocessing import load_image_from_bytes
from app.services.image_processing.segmentation import segment_tomato_with_mask
from app.services.model.predictor import model_is_ready, predict_label


class ModelNotReadyError(RuntimeError):
    """Bobot MobileNetV2 belum tersedia sehingga prediksi tidak bisa dijalankan."""


def classify_tomato(image_bytes: bytes) -> PredictionResponse:
    """Jalankan seluruh pipeline klasifikasi untuk satu gambar.

    Tahapan:
        1. baca & normalisasi ukuran gambar (preprocessing),
        2. segmentasi objek tomat (HSV threshold -> mask -> morfologi),
        3. analisis warna area tomat (metadata, bukan input model),
        4. klasifikasi dengan MobileNetV2 pada citra asli (bukan segmentasi).

    Model menerima citra asli yang sudah di-resize ke 224x224 — sama dengan
    distribusi saat training (citra tomat utuh dengan background). Hasil
    segmentasi hanya dipakai untuk mengisi ``color_analysis`` pada respons.

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

    # Segmentasi untuk metadata warna. Bila gagal (mask kosong),
    # color_analysis = None dan model tetap menerima citra asli.
    _, mask, hsv_array = segment_tomato_with_mask(image)
    color_analysis = analyze_color(mask, hsv_array)

    # Model dilatih pada citra asli (background disertakan), jadi kirim
    # citra asli, bukan hasil segmentasi yang background-nya hitam.
    return predict_label(image, color_analysis=color_analysis)
