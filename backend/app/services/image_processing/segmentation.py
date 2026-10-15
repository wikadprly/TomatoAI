"""Tahap 6: segmentasi objek tomat.

Menggabungkan seluruh tahap sebelumnya menjadi satu fungsi yang mengembalikan
citra tomat yang sudah terisolasi dari latar belakang, siap dikirim ke model.
"""

from PIL import Image
import numpy as np

# Import modul-modul lain yang sudah kita buat sebelumnya
from . import color_space
from . import thresholding
from . import masking
from . import morphology


def segment_tomato(
    image: Image.Image,
    hsv_image: Image.Image | None = None,
) -> Image.Image:
    """Jalankan seluruh rantai pemrosesan untuk satu citra.

    Urutan: RGB -> HSV -> thresholding -> masking -> morphology -> apply mask.

    Args:
        image: Citra RGB hasil pra-pemrosesan.
        hsv_image: Citra HSV kalau sudah dihitung sebelumnya, agar tidak diulang.

    Returns:
        Citra tomat yang sudah terisolasi dari latar belakang.
    """
    segmented_image, _, _ = segment_tomato_with_mask(image, hsv_image)
    return segmented_image


def segment_tomato_with_mask(
    image: Image.Image,
    hsv_image: Image.Image | None = None,
) -> tuple[Image.Image, Image.Image, Image.Image]:
    """Sama seperti `segment_tomato`, tapi sekaligus mengembalikan mask & HSV.

    Dipakai pipeline prediksi supaya tahap analisis warna
    (`color_analysis.analyze_color`) bisa memakai mask dan HSV yang sama,
    tanpa menghitung ulang.

    Returns:
        Tuple (citra_tomat, mask_final, citra_hsv).
    """
    # 1. Konversi ke HSV jika belum ada
    if hsv_image is None:
        hsv_img = color_space.rgb_to_hsv(image)
    else:
        hsv_img = hsv_image

    # 2. Thresholding HSV. Rentang melingkar (160, 20) menangkap merah di
    # kedua ujung Hue (160-179 dan 0-20) sekaligus warna oranye awal.
    candidate_mask = thresholding.threshold_hsv(
        hsv_image=hsv_img,
        hue_range=(160, 20),
        saturation_min=50,
        value_min=50,
    )

    # 3. Masking dasar untuk membersihkan area kecil berdasarkan luas minimum
    cleaned_mask = masking.build_mask(candidate_mask, min_object_area=500)

    # 4. Operasi morfologi (opening & closing) untuk merapikan mask
    smooth_mask = morphology.apply_morphology(cleaned_mask, kernel_size=3)

    # 5. Ambil objek terbesar saja agar fokus ke satu tomat utama
    final_mask = masking.largest_object(smooth_mask)

    # 6. Terapkan mask ke citra asli (background jadi hitam)
    segmented_image = masking.apply_mask(image, final_mask)

    return segmented_image, final_mask, hsv_img


def bounding_box(mask: Image.Image) -> tuple[int, int, int, int] | None:
    """Ambil kotak pembatas objek tomat.

    Berguna bila model perlu potongan objek yang tightly cropped.

    Args:
        mask: Mask biner objek tomat.

    Returns:
        Tuple (x, y, width, height), atau `None` bila mask kosong.
    """
    mask_np = np.array(mask)
    
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