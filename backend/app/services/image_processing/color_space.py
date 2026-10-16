"""Tahap 2: konversi ruang warna RGB ke HSV.

Mengapa HSV dipakai:
- Hue memisahkan warna tomat dari warna hijau daun tanpa terpengaruh cahaya.
- Value lebih stabil terhadap perubahan pencahayaan, sehingga thresholding
  dan analisis warna lebih tahan variasi pencahayaan.
"""

from __future__ import annotations

from PIL import Image
import numpy as np
import cv2

__all__ = ["rgb_to_hsv", "hsv_channels"]


def rgb_to_hsv(image: Image.Image) -> np.ndarray:
    """Konversi citra RGB menjadi array HSV (NumPy, bukan PIL).

    PIL tidak memiliki mode HSV untuk gambar berwarna, sehingga
    merepresentasikan data HSV sebagai ``Image(mode="RGB")`` menyesatkan:
    konsumen yang memanggil ``.convert``/``.save``/``.getpixel`` akan
    mendapatkan data yang dianggap RGB. Karena itu fungsi ini mengembalikan
    ``np.ndarray`` langsung — setiap pemanggil membaca kanal H/S/V sebagai
    indeks ``[:,:,0]``/``[:,:,1]``/``[:,:,2]``.

    Args:
        image: Citra RGB (PIL.Image).

    Returns:
        ``np.ndarray`` berbentuk ``(H, W, 3)`` dtype ``uint8`` dengan
        Hue 0-179, Saturation 0-255, Value 0-255 (skala OpenCV).
    """
    img_np = np.asarray(image, dtype=np.uint8)
    hsv_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)
    return hsv_np


def hsv_channels(hsv_array: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Pisahkan array HSV menjadi tiga kanal (H, S, V) sebagai array grayscale.

    Args:
        hsv_array: Array HSV dari :func:`rgb_to_hsv`.

    Returns:
        Tuple ``(hue, saturation, value)``; masing-masing array 2-D ``uint8``.
    """
    h, s, v = cv2.split(hsv_array)
    return h, s, v