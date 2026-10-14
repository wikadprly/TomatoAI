"""Tahap 3: thresholding.

Memisahkan piksel tomat dari latar belakang berdasarkan ambang (threshold)
pada kanal Hue, Saturation, dan Value hasil konversi HSV.
"""

from PIL import Image
import numpy as np
import cv2


def apply_threshold(
    channel: Image.Image,
    min_value: int,
    max_value: int,
) -> Image.Image:
    """Threshold satu kanal HSV ke dalam citra biner (0 atau 255).

    Args:
        channel: Kanal H, S, atau V.
        min_value: Ambang bawah (inklusif).
        max_value: Ambang atas (inklusif).

    Returns:
        Citra biner: 255 bila nilai piksel berada di antara kedua ambang.
    """
    arr = np.array(channel)
    # Gunakan cv2.inRange untuk membuat mask berdasarkan min dan max value
    mask = cv2.inRange(arr, min_value, max_value)
    return Image.fromarray(mask)


def threshold_hsv(
    hsv_image: Image.Image,
    hue_range: tuple[int, int],
    saturation_min: int,
    value_min: int,
) -> Image.Image:
    """Gabungkan ambang dari ketiga kanal menjadi satu mask kandidat tomat.

    Args:
        hsv_image: Citra HSV dari `color_space.rgb_to_hsv`.
        hue_range: Rentang Hue yang dianggap warna tomat.
        saturation_min: Ambang bawah Saturation.
        value_min: Ambang bawah Value.

    Returns:
        Mask biner kandidat tomat.
    """
    hsv_np = np.array(hsv_image)
    
    # Tentukan batas bawah dan batas atas dalam format HSV OpenCV
    # Hue: 0-179, Saturation: 0-255, Value: 0-255
    lower_bound = np.array([hue_range[0], saturation_min, value_min])
    upper_bound = np.array([hue_range[1], 255, 255])
    
    # Buat mask biner menggunakan cv2.inRange
    mask = cv2.inRange(hsv_np, lower_bound, upper_bound)
    
    return Image.fromarray(mask)