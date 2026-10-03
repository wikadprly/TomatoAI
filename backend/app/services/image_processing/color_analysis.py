"""Tahap 7 (Tim 1): analisis warna hasil segmentasi.

Menghasilkan angka-angka warna yang diisi ke `ColorAnalysis` pada response API.
Data ini juga berguna sebagai interpretasi pendukung hasil klasifikasi
MobileNetV2 milik Tim 2.
"""

from PIL import Image

from app.schemas.prediction import ColorAnalysis

TODO = "Tim 1: isi image_processing/color_analysis.py"


def analyze_color(mask: Image.Image, hsv_image: Image.Image) -> ColorAnalysis:
    """Hitung statistik warna hanya pada area objek tomat.

    Args:
        mask: Mask biner objek tomat dari `segmentation.segment_tomato`.
        hsv_image: Citra HSV yang sudah dipakai saat segmentasi.

    Returns:
        `ColorAnalysis` berisi Hue, Saturasi, Value, dan rasio area.
    """
    raise NotImplementedError(TODO)


def object_ratio(mask: Image.Image) -> float:
    """Rasio piksel tomat terhadap seluruh area gambar (0.0-1.0)."""
    raise NotImplementedError(TODO)