"""Tahap 5: morphology.

Operasi matematis pada mask untuk membersihkan noise:
- opening (erosi lalu dilasi): membuang piksel noise kecil.
- closing (dilasi lalu erosi): menutup lubang kecil pada area tomat.
"""

from PIL import Image
import numpy as np
import cv2


def apply_morphology(mask: Image.Image, kernel_size: int = 3) -> Image.Image:
    """Terapkan opening lalu closing pada mask.

    Args:
        mask: Mask biner dari `masking.build_mask`.
        kernel_size: Ukuran kernel structuring element (harus ganjil).

    Returns:
        Mask biner yang sudah bersih.
    """
    opened = open_mask(mask, kernel_size)
    closed = close_mask(opened, kernel_size)
    return closed


def open_mask(mask: Image.Image, kernel_size: int = 3) -> Image.Image:
    """Opening: buang noise sekecil kecilannya."""
    mask_np = np.array(mask)
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    # Opening = Erosi dilanjut Dilasi
    result = cv2.morphologyEx(mask_np, cv2.MORPH_OPEN, kernel)
    return Image.fromarray(result)


def close_mask(mask: Image.Image, kernel_size: int = 3) -> Image.Image:
    """Closing: tutup lubang kecil pada objek tomat."""
    mask_np = np.array(mask)
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    # Closing = Dilasi dilanjut Erosi
    result = cv2.morphologyEx(mask_np, cv2.MORPH_CLOSE, kernel)
    return Image.fromarray(result)