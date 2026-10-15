"""Tahap 2: konversi ruang warna RGB ke HSV.

Mengapa HSV dipakai:
- Hue memisahkan warna tomat dari warna hijau daun tanpa terpengaruh cahaya.
- Value lebih stabil terhadap perubahan pencahayaan, sehingga thresholding
  dan analisis warna lebih tahan variasi pencahayaan.
"""

from PIL import Image
import numpy as np
import cv2

# Hapus variabel TODO atau biarkan, lalu implementasikan fungsinya:

def rgb_to_hsv(image: Image.Image) -> Image.Image:
    """Konversi citra RGB menjadi HSV.

    Args:
        image: Citra RGB.

    Returns:
        Citra HSV dengan Hue 0-179, Saturation 0-255, Value 0-255 (skala OpenCV).
    """
    # Konversi PIL Image (RGB) ke NumPy array
    img_np = np.array(image)
    
    # Konversi RGB ke HSV menggunakan OpenCV
    hsv_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)
    
    # Kembalikan kembali ke bentuk PIL Image
    return Image.fromarray(hsv_np)


def hsv_channels(hsv_image: Image.Image) -> tuple[Image.Image, Image.Image, Image.Image]:
    """Pisahkan citra HSV menjadi kanal H, S, dan V.

    Args:
        hsv_image: Citra hasil `rgb_to_hsv`.

    Returns:
        Tuple berisi tiga citra grayscale: (hue, saturation, value).
    """
    # Konversi PIL Image ke NumPy array
    hsv_np = np.array(hsv_image)
    
    # Pisahkan kanal H, S, V
    h, s, v = cv2.split(hsv_np)
    
    # Ubah masing-masing kanal menjadi PIL Image grayscale
    return Image.fromarray(h) , Image.fromarray(s), Image.fromarray(v)