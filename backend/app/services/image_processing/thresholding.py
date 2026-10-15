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

    Hue di OpenCV bersifat melingkar (0-179), sehingga warna merah berada di
    dua ujung sekaligus: 0-10 dan 160-179. Untuk mendeteksi merah tanpa
    terbelah, kirim `hue_range` dengan nilai bawah lebih besar dari atas,
    misalnya `(160, 20)` yang berarti 160-179 DAN 0-20.

    Args:
        hsv_image: Citra HSV dari `color_space.rgb_to_hsv`.
        hue_range: Rentang Hue yang dianggap warna tomat. Rentang normal
            `(min, max)` dengan `min <= max`, atau rentang melingkar
            `(min, max)` dengan `min > max` untuk menangkap dua ujung Hue.
        saturation_min: Ambang bawah Saturation.
        value_min: Ambang bawah Value.

    Returns:
        Mask biner kandidat tomat.
    """
    hsv_np = np.array(hsv_image)
    hue_min, hue_max = hue_range

    # Batas kanal S dan V sama untuk semua rentang Hue.
    lower_sv = np.array([0, saturation_min, value_min])
    upper_sv = np.array([0, 255, 255])

    if hue_min <= hue_max:
        lower_bound = np.array([hue_min, saturation_min, value_min])
        upper_bound = np.array([hue_max, 255, 255])
        mask = cv2.inRange(hsv_np, lower_bound, upper_bound)
    else:
        # Rentang melingkar: gabungkan ujung atas (hue_min-179) dan ujung
        # bawah (0-hue_max) dengan operasi OR.
        lower_high = lower_sv.copy()
        lower_high[0] = hue_min
        upper_high = upper_sv.copy()
        upper_high[0] = 179

        lower_low = lower_sv.copy()
        upper_low = upper_sv.copy()
        upper_low[0] = hue_max

        mask = cv2.bitwise_or(
            cv2.inRange(hsv_np, lower_high, upper_high),
            cv2.inRange(hsv_np, lower_low, upper_low),
        )

    return Image.fromarray(mask)