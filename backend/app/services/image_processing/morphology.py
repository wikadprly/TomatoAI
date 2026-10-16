"""Tahap 5: morphology.

Operasi matematis pada mask untuk membersihkan noise:
- opening (erosi lalu dilasi): membuang piksel noise kecil.
- closing (dilasi lalu erosi): menutup lubang kecil pada area tomat.
"""

from __future__ import annotations

from PIL import Image
import numpy as np
import cv2

__all__ = ["apply_morphology", "open_mask", "close_mask"]


def apply_morphology(mask: np.ndarray, kernel_size: int = 3) -> np.ndarray:
    """Terapkan opening lalu closing pada mask.

    Args:
        mask: Mask biner dari :func:`masking.build_mask` (array 2-D ``uint8``).
        kernel_size: Ukuran kernel structuring element (harus ganjil).

    Returns:
        Mask biner yang sudah bersih (array 2-D ``uint8``).
    """
    opened = open_mask(mask, kernel_size)
    closed = close_mask(opened, kernel_size)
    return closed


def open_mask(mask: np.ndarray, kernel_size: int = 3) -> np.ndarray:
    """Opening: buang noise sekecil kecilannya."""
    mask_np = np.asarray(mask)
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    return cv2.morphologyEx(mask_np, cv2.MORPH_OPEN, kernel)


def close_mask(mask: np.ndarray, kernel_size: int = 3) -> np.ndarray:
    """Closing: tutup lubang kecil pada objek tomat."""
    mask_np = np.asarray(mask)
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    return cv2.morphologyEx(mask_np, cv2.MORPH_CLOSE, kernel)