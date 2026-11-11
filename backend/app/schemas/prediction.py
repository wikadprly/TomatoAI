"""Bentuk data yang dikirim backend ke frontend.

Frontend (Tim 3 & 4) cukup menyalin struktur ini ke TypeScript.
Lihat `frontend/src/lib/types.ts`.
"""

from pydantic import BaseModel, Field


class ColorAnalysis(BaseModel):
    """Ringkasan analisis warna objek tomat (hasil segmentasi)."""

    mean_hue: float | None = Field(
        default=None,
        description="Rata-rata Hue dalam skala 0-179.",
    )
    mean_saturation: float | None = Field(
        default=None,
        description="Rata-rata Saturasi dalam skala 0-255.",
    )
    mean_value: float | None = Field(
        default=None,
        description="Rata-rata Value (intensitas) dalam skala 0-255.",
    )
    object_ratio: float | None = Field(
        default=None,
        description="Rasio piksel tomat terhadap seluruh area gambar (0.0-1.0).",
    )


class ShapeMetrics(BaseModel):
    """Metrik bentuk mask objek tomat — dipakai guard, juga ditampilkan ke user."""

    area_ratio: float = Field(description="Luas objek / luas gambar.")
    circularity: float = Field(description="1.0 = lingkaran sempurna.")
    fill_ratio: float = Field(description="Luas objek / luas bounding box.")
    solidity: float = Field(description="Luas objek / luas convex hull.")
    aspect_ratio: float = Field(description="Lebar / tinggi bounding box.")


class SegmentationImages(BaseModel):
    """Visual hasil pengolahan citra, dikirim sebagai data URL siap pakai.

    Tujuannya membuat proses segmentasi bisa dilihat pengguna: foto asli,
    mask HSV, dan citra yang benar-benar diterima model. Ukuran tiap gambar
    kecil (~10-20 KB) karena sudah di-resize ke 224x224.
    """

    mask_png: str | None = Field(
        default=None,
        description="Mask biner objek (PNG, data URL). Null bila mask kosong.",
    )
    model_input_jpeg: str | None = Field(
        default=None,
        description="Citra persis yang diterima MobileNetV2 (data URL).",
    )
    overlay_jpeg: str | None = Field(
        default=None,
        description="Foto asli + kontur mask yang terdeteksi (data URL).",
    )


class PredictionResponse(BaseModel):
    """Hasil klasifikasi tingkat kematangan tomat."""

    label: str = Field(
        description="Kelas hasil prediksi, sesuai CLASS_NAMES di config.",
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Nilai keyakinan model terhadap kelas terpilih (0.0-1.0).",
    )
    probabilities: dict[str, float] = Field(
        description="Nilai keyakinan untuk setiap kelas.",
    )
    color_analysis: ColorAnalysis | None = Field(
        default=None,
        description="Analisis warna hasil segmentasi. Null bila segmentasi belum aktif.",
    )
    segmentation: SegmentationImages | None = Field(
        default=None,
        description="Visual mask/ROI yang dipakai model. Null bila fitur dimatikan.",
    )
    shape_metrics: ShapeMetrics | None = Field(
        default=None,
        description="Metrik bentuk mask yang dipakai guard.",
    )
    input_mode: str | None = Field(
        default=None,
        description="Mode input model yang aktif: original / crop / segment.",
    )


class HealthResponse(BaseModel):
    """Status backend, berguna untuk cek koneksi dari frontend."""

    status: str = Field(description="ok bila backend berjalan normal.")
    app: str
    version: str
    model_loaded: bool = Field(
        description="True bila bobot MobileNetV2 tersedia dan TensorFlow bisa diimpor.",
    )
    uptime_seconds: float | None = Field(
        default=None,
        description="Lama proses berjalan, berguna untuk memantau restart.",
    )
    input_mode: str | None = Field(default=None, description="Mode input model aktif.")


class ClassMetric(BaseModel):
    """Metrik per kelas yang diturunkan dari confusion matrix."""

    label: str
    precision: float
    recall: float
    f1: float
    support: int


class ModelInfoResponse(BaseModel):
    """Ringkasan performa model untuk halaman publik "Performa Model"."""

    model_name: str = Field(description="Nama file bobot, tanpa path absolut.")
    generated_at: str | None = Field(default=None, description="Waktu evaluasi terakhir.")
    image_size: int
    class_names: list[str]
    test_set_size: int
    accuracy: float
    precision: float
    recall: float
    f1: float
    confusion_matrix: list[list[int]]
    per_class: list[ClassMetric]
    input_mode: str
    guard_enabled: bool
