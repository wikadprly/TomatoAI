"""Pipeline end-to-end: gambar -> pengolahan citra -> MobileNetV2 -> label.

Modul ini hanya merangkai urutan tahap. Logika tiap tahap ada di:
- `services/image_processing/`
- `services/model/`

Alur:
    1. pra-pemrosesan: baca citra, normalisasi ukuran;
    2. segmentasi HSV + morfologi: isolasi objek tomat -> mask;
    3. analisis warna area tomat -> `ColorAnalysis` (metadata);
    4. pemilihan input model sesuai `INFERENCE_INPUT_MODE`:
       - `original`: citra 224 asli (distribusi saat training),
       - `crop`: hasil potong bbox mask dari resolusi penuh,
       - `segment`: citra hasil masking (latar hitam);
    5. klasifikasi MobileNetV2;
    6. guard "khusus tomat" (validasi bentuk mask + keyakinan model).

Default `original` dipertahankan karena model dilatih pada citra utuh.
Setelah `scripts/evaluate_input_modes.py` dijalankan pada test set, mode
`crop`/`segment` bisa diaktifkan lewat env bila hasilnya lebih baik/setara.
"""

from app.core.config import settings
from app.schemas.prediction import PredictionResponse
from app.services.image_processing.color_analysis import analyze_color
from app.services.image_processing.preprocessing import load_image_raw
from app.services.image_processing.roi import prepare_model_input
from app.services.image_processing.segmentation import segment_tomato_with_mask
from app.services.model.predictor import model_is_ready, predict_label


class ModelNotReadyError(RuntimeError):
    """Bobot MobileNetV2 belum tersedia sehingga prediksi tidak bisa dijalankan."""


def classify_tomato(image_bytes: bytes) -> PredictionResponse:
    """Jalankan seluruh pipeline klasifikasi untuk satu gambar.

    Tahapan:
        1. baca & normalisasi ukuran gambar (preprocessing),
        2. segmentasi objek tomat (HSV threshold -> mask -> morfologi),
        3. analisis warna area tomat (metadata),
        4. pilih input model sesuai `settings.INFERENCE_INPUT_MODE`,
        5. klasifikasi dengan MobileNetV2,
        6. guard "khusus tomat".

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

    raw_image = load_image_raw(image_bytes)
    image = raw_image.resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE))

    # Segmentasi untuk metadata warna sekaligus sumber input model
    # (mode crop/segment). Bila mask kosong, color_analysis = None dan
    # mode crop/segment otomatis jatuh ke citra asli.
    segmented_image, mask, hsv_array = segment_tomato_with_mask(image)
    color_analysis = analyze_color(mask, hsv_array)

    model_input = prepare_model_input(
        raw_image,
        image,
        segmented_image,
        mask,
        mode=settings.INFERENCE_INPUT_MODE,
        margin_ratio=settings.CROP_MARGIN_RATIO,
    )

    # `mask` diteruskan ke guard "khusus tomat" (validasi bentuk objek).
    return predict_label(model_input, color_analysis=color_analysis, mask=mask)
