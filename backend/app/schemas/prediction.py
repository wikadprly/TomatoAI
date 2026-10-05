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


class HealthResponse(BaseModel):
    """Status backend, berguna untuk cek koneksi dari frontend."""

    status: str = Field(description="ok bila backend berjalan normal.")
    app: str
    version: str
    model_loaded: bool = Field(
        description="True bila bobot MobileNetV2 sudah tersedia di disk.",
    )