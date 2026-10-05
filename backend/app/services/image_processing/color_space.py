"""Tahap 2: konversi ruang warna RGB ke HSV.

Mengapa HSV dipakai:
- Hue memisahkan warna tomat dari warna hijau daun tanpa terpengaruh cahaya.
- Value lebih stabil terhadap perubahan pencahayaan, sehingga thresholding
  dan analisis warna lebih tahan variasi pencahayaan.
"""

from PIL import Image

TODO = "Isi image_processing/color_space.py"


def rgb_to_hsv(image: Image.Image) -> Image.Image:
    """Konversi citra RGB menjadi HSV.

    Args:
        image: Citra RGB.

    Returns:
        Citra HSV dengan Hue 0-179, Saturation 0-255, Value 0-255 (skala OpenCV).
    """
    raise NotImplementedError(TODO)


def hsv_channels(hsv_image: Image.Image) -> tuple[Image.Image, Image.Image, Image.Image]:
    """Pisahkan citra HSV menjadi kanal H, S, dan V.

    Args:
        hsv_image: Citra hasil `rgb_to_hsv`.

    Returns:
        Tuple berisi tiga citra grayscale: (hue, saturation, value).
    """
    raise NotImplementedError(TODO)