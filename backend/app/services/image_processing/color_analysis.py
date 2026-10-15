"""Tahap 7: analisis warna hasil segmentasi.

Menghasilkan angka-angka warna yang diisi ke `ColorAnalysis` pada response API.
Data ini juga berguna sebagai interpretasi pendukung hasil klasifikasi
MobileNetV2.
"""

from PIL import Image
import numpy as np

from app.schemas.prediction import ColorAnalysis


def analyze_color(mask: Image.Image, hsv_image: Image.Image) -> ColorAnalysis | None:
    """Hitung statistik warna hanya pada area objek tomat.

    Args:
        mask: Mask biner objek tomat dari `segmentation.segment_tomato_with_mask`.
        hsv_image: Citra HSV yang sudah dipakai saat segmentasi.

    Returns:
        `ColorAnalysis` berisi Hue, Saturasi, Value, dan rasio area, atau
        `None` bila mask kosong (tidak ada objek tomat terdeteksi). `None`
        dipakai pemanggil sebagai sinyal untuk memakai citra asli tanpa
        segmentasi.
    """
    mask_np = np.array(mask)
    hsv_np = np.array(hsv_image)

    # Ambil indeks piksel di mana mask bernilai > 0 (area tomat)
    tomat_pixels = (mask_np > 0)

    if not np.any(tomat_pixels):
        # Mask kosong: tidak ada objek tomat yang terdeteksi.
        return None

    # Ekstrak kanal H, S, V hanya pada piksel tomat
    h_channel = hsv_np[:, :, 0][tomat_pixels]
    s_channel = hsv_np[:, :, 1][tomat_pixels]
    v_channel = hsv_np[:, :, 2][tomat_pixels]

    mean_h = float(np.mean(h_channel))
    mean_s = float(np.mean(s_channel))
    mean_v = float(np.mean(v_channel))

    ratio = object_ratio(mask)

    return ColorAnalysis(
        mean_hue=mean_h,
        mean_saturation=mean_s,
        mean_value=mean_v,
        object_ratio=ratio,
    )


def object_ratio(mask: Image.Image) -> float:
    """Rasio piksel tomat terhadap seluruh area gambar (0.0-1.0)."""
    mask_np = np.array(mask)
    total_pixels = mask_np.size
    
    if total_pixels == 0:
        return 0.0
        
    tomat_pixel_count = np.count_nonzero(mask_np > 0)
    return float(tomat_pixel_count / total_pixels)