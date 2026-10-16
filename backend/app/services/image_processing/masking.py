"""Tahap 4: masking.

Mengubah hasil thresholding menjadi mask final objek tomat, yaitu citra biner
yang hanya berisi 255 untuk piksel tomat dan 0 untuk piksel lainnya.
"""

from __future__ import annotations

from PIL import Image
import numpy as np
import cv2

__all__ = ["build_mask", "largest_object", "apply_mask"]


def build_mask(
    candidate_mask: np.ndarray,
    min_object_area: int = 500,
) -> np.ndarray:
    """Bersihkan mask kandidat menjadi mask objek tomat.

    Args:
        candidate_mask: Mask biner dari :func:`thresholding.threshold_hsv`
            (array 2-D ``uint8``).
        min_object_area: Luas minimum (piksel) agar sebuah blob dianggap tomat.

    Returns:
        Mask biner final (array 2-D ``uint8``): 255 untuk tomat, 0 untuk
        latar belakang.
    """
    mask_np = np.asarray(candidate_mask)

    # Cari komponen terhubung (contours)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask_np, connectivity=8)

    cleaned_mask = np.zeros_like(mask_np)

    # Lewati label 0 (background), lalu filter berdasarkan luas minimum
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= min_object_area:
            cleaned_mask[labels == i] = 255

    return cleaned_mask


def largest_object(mask: np.ndarray) -> np.ndarray:
    """Ambil hanya komponen terbesar sebagai objek tomat utama.

    Args:
        mask: Mask biner (array 2-D ``uint8``).

    Returns:
        Mask yang hanya menyisakan komponen terbesar (array 2-D ``uint8``).
    """
    mask_np = np.asarray(mask)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask_np, connectivity=8)

    if num_labels <= 1:
        return np.zeros_like(mask_np)

    # Cari indeks komponen terbesar (selain background di indeks 0).
    largest_label = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))

    largest_mask = np.zeros_like(mask_np)
    largest_mask[labels == largest_label] = 255

    return largest_mask


def apply_mask(image: Image.Image, mask: np.ndarray) -> Image.Image:
    """Terapkan mask pada citra asli.

    Fungsi ini mengembalikan citra dengan area di luar mask menjadi hitam,
    yang kemudian dikirim ke model MobileNetV2.

    Args:
        image: Citra asli (PIL.Image RGB).
        mask: Mask biner hasil :func:`build_mask` (array 2-D ``uint8``).

    Returns:
        Citra baru (PIL.Image RGB) dengan area di luar mask menjadi hitam.
    """
    img_np = np.asarray(image, dtype=np.uint8)
    mask_np = np.asarray(mask)

    # Pastikan mask 2-D sesuai ukuran HxW citra. Bila ukuran tidak cocok,
    # resize mask ke ukuran citra untuk menghindari crash OpenCV.
    if mask_np.shape[:2] != img_np.shape[:2]:
        mask_np = cv2.resize(
            mask_np, (img_np.shape[1], img_np.shape[0]),
            interpolation=cv2.INTER_NEAREST,
        )

    # Pastikan mask memiliki 3 channel untuk operasi bitwise_and.
    if mask_np.ndim == 2:
        mask_3ch = cv2.cvtColor(mask_np, cv2.COLOR_GRAY2RGB)
    else:
        mask_3ch = mask_np

    result = cv2.bitwise_and(img_np, mask_3ch)
    return Image.fromarray(result)