"""Tahap 4: masking.

Mengubah hasil thresholding menjadi mask final objek tomat, yaitu citra biner
yang hanya berisi 255 untuk piksel tomat dan 0 untuk piksel lainnya.
"""

from PIL import Image
import numpy as np
import cv2


def build_mask(
    candidate_mask: Image.Image,
    min_object_area: int = 500,
) -> Image.Image:
    """Bersihkan mask kandidat menjadi mask objek tomat.

    Args:
        candidate_mask: Mask biner dari `thresholding.threshold_hsv`.
        min_object_area: Luas minimum (piksel) agar sebuah blob dianggap tomat.

    Returns:
        Mask biner final, 255 untuk tomat dan 0 untuk latar belakang.
    """
    mask_np = np.array(candidate_mask)
    
    # Cari komponen terhubung (contours)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_np, connectivity=8)
    
    cleaned_mask = np.zeros_like(mask_np)
    
    # Lewati label 0 (background), lalu filter berdasarkan luas minimum
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= min_object_area:
            cleaned_mask[labels == i] = 255
            
    return Image.fromarray(cleaned_mask)


def largest_object(mask: Image.Image) -> Image.Image:
    """Ambil hanya komponen terbesar sebagai objek tomat utama.

    Args:
        mask: Mask biner.

    Returns:
        Mask yang hanya menyisakan komponen terbesar.
    """
    mask_np = np.array(mask)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_np, connectivity=8)
    
    if num_labels <= 1:
        return Image.fromarray(np.zeros_like(mask_np))
    
    # Cari indeks komponen terbesar (selain background di indeks 0)
    # stats[1:, cv2.CC_STAT_AREA] mengambil area dari label 1 sampai akhir
    largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    
    largest_mask = np.zeros_like(mask_np)
    largest_mask[labels == largest_label] = 255
    
    return Image.fromarray(largest_mask)


def apply_mask(image: Image.Image, mask: Image.Image) -> Image.Image:
    """Terapkan mask pada citra asli.

    Fungsi ini biasanya mengembalikan citra dengan area di luar mask
    menjadi hitam, yang kemudian dikirim ke model MobileNetV2.

    Args:
        image: Citra asli.
        mask: Mask biner hasil `build_mask`.

    Returns:
        Citra baru dengan area di luar mask menjadi hitam.
    """
    img_np = np.array(image)
    mask_np = np.array(mask)
    
    # Pastikan mask memiliki 3 channel atau sesuaikan ukurannya untuk operasi bitwise
    if len(mask_np.shape) == 2:
        mask_3ch = cv2.cvtColor(mask_np, cv2.COLOR_GRAY2RGB)
    else:
        mask_3ch = mask_np
        
    # Terapkan bitwise_and untuk memotong background jadi hitam
    result = cv2.bitwise_and(img_np, mask_3ch)
    
    return Image.fromarray(result)