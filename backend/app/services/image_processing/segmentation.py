"""Tahap 6: segmentasi objek tomat.

Menggabungkan seluruh tahap sebelumnya menjadi satu fungsi yang mengembalikan
citra tomat yang sudah terisolasi dari latar belakang, siap dikirim ke model.
"""

from __future__ import annotations

import cv2
from PIL import Image
import numpy as np

# Import modul-modul lain yang sudah kita buat sebelumnya
from . import color_space
from . import thresholding
from . import masking
from . import morphology

__all__ = ["segment_tomato", "segment_tomato_with_mask", "bounding_box"]


def segment_tomato(
    image: Image.Image,
    hsv_array: np.ndarray | None = None,
) -> Image.Image:
    """Jalankan seluruh rantai pemrosesan untuk satu citra.

    Urutan: RGB -> HSV -> thresholding -> masking -> morphology -> apply mask.

    Args:
        image: Citra RGB hasil pra-pemrosesan.
        hsv_array: Array HSV kalau sudah dihitung sebelumnya, agar tidak
            diulang.

    Returns:
        Citra tomat yang sudah terisolasi dari latar belakang.
    """
    segmented_image, _, _ = segment_tomato_with_mask(image, hsv_array)
    return segmented_image


def segment_tomato_with_mask(
    image: Image.Image,
    hsv_array: np.ndarray | None = None,
) -> tuple[Image.Image, np.ndarray, np.ndarray]:
    """Sama seperti :func:`segment_tomato`, tapi sekaligus mengembalikan mask & HSV.

    Dipakai pipeline prediksi supaya tahap analisis warna
    (:func:`color_analysis.analyze_color`) bisa memakai mask dan HSV yang sama,
    tanpa menghitung ulang.

    Args:
        image: Citra RGB hasil pra-pemrosesan (PIL.Image).
        hsv_array: Array HSV kalau sudah dihitung sebelumnya.

    Returns:
        Tuple ``(citra_tomat, mask_final, hsv_array)``. Citra tomat adalah
        ``PIL.Image`` RGB; mask dan HSV adalah ``np.ndarray``.
    """
    # 1. Konversi ke HSV jika belum ada
    if hsv_array is None:
        hsv_arr = color_space.rgb_to_hsv(image)
    else:
        hsv_arr = hsv_array

    # 2. Thresholding HSV. Dua mask digabung dengan OR:
    #    - Rentang melingkar (160, 20) menangkap merah/jingga di kedua ujung
    #      Hue (160-179 dan 0-20).
    #    - Rentang (20, 90) menangkap kuning-hijau, supaya tomat mentah dan
    #      setengah matang ikut tersegmentasi. Tanpa rentang ini, kelas
    #      mentah selalu bermask kosong dan color_analysis selalu null.
    mask_merah = thresholding.threshold_hsv(
        hsv_array=hsv_arr,
        hue_range=(160, 20),
        saturation_min=50,
        value_min=50,
    )
    mask_hijau_kuning = thresholding.threshold_hsv(
        hsv_array=hsv_arr,
        hue_range=(20, 90),
        saturation_min=50,
        value_min=50,
    )
    candidate_mask = cv2.bitwise_or(mask_merah, mask_hijau_kuning)

    # 3. Masking dasar untuk membersihkan area kecil berdasarkan luas minimum
    cleaned_mask = masking.build_mask(candidate_mask, min_object_area=500)

    # 4. Operasi morfologi (opening & closing) untuk merapikan mask
    smooth_mask = morphology.apply_morphology(cleaned_mask, kernel_size=3)

    # 5. Ambil objek terbesar saja agar fokus ke satu tomat utama
    final_mask = masking.largest_object(smooth_mask)

    # 6. Terapkan mask ke citra asli (background jadi hitam)
    segmented_image = masking.apply_mask(image, final_mask)

    return segmented_image, final_mask, hsv_arr


def bounding_box(mask: np.ndarray) -> tuple[int, int, int, int] | None:
    """Ambil kotak pembatas objek tomat.

    Berguna bila model perlu potongan objek yang tightly cropped.

    Args:
        mask: Mask biner objek tomat (array 2-D ``uint8``).

    Returns:
        Tuple ``(x, y, width, height)``, atau ``None`` bila mask kosong.
    """
    mask_np = np.asarray(mask)

    # Cari indeks piksel yang bernilai putih (255)
    y_indices, x_indices = np.where(mask_np > 0)

    if len(x_indices) == 0 or len(y_indices) == 0:
        return None

    x_min = int(np.min(x_indices))
    x_max = int(np.max(x_indices))
    y_min = int(np.min(y_indices))
    y_max = int(np.max(y_indices))

    width = x_max - x_min
    height = y_max - y_min

    return (x_min, y_min, width, height)