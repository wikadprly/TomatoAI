"""Tahap 3: thresholding.

Memisahkan piksel tomat dari latar belakang berdasarkan ambang (threshold)
pada kanal Hue, Saturation, dan Value hasil konversi HSV.
"""

from __future__ import annotations

from PIL import Image
import numpy as np
import cv2

__all__ = ["apply_threshold", "threshold_hsv"]


def apply_threshold(
    channel: np.ndarray,
    min_value: int,
    max_value: int,
) -> np.ndarray:
    """Threshold satu kanal HSV ke dalam citra biner (0 atau 255).

    Args:
        channel: Kanal H, S, atau V (array 2-D ``uint8``).
        min_value: Ambang bawah (inklusif).
        max_value: Ambang atas (inklusif).

    Returns:
        Mask biner (array 2-D ``uint8``): 255 bila nilai piksel berada di
        antara kedua ambang, 0 sebaliknya.
    """
    arr = np.asarray(channel)
    return cv2.inRange(arr, min_value, max_value)


def threshold_hsv(
    hsv_array: np.ndarray,
    hue_range: tuple[int, int],
    saturation_min: int,
    value_min: int,
) -> np.ndarray:
    """Gabungkan ambang dari ketiga kanal menjadi satu mask kandidat tomat.

    Hue di OpenCV bersifat melingkar (0-179), sehingga warna merah berada di
    dua ujung sekaligus: 0-10 dan 160-179. Untuk mendeteksi merah tanpa
    terbelah, kirim ``hue_range`` dengan nilai bawah lebih besar dari atas,
    misalnya ``(160, 20)`` yang berarti 160-179 DAN 0-20.

    Args:
        hsv_array: Array HSV dari :func:`color_space.rgb_to_hsv`.
        hue_range: Rentang Hue yang dianggap warna tomat. Rentang normal
            ``(min, max)`` dengan ``min <= max``, atau rentang melingkar
            ``(min, max)`` dengan ``min > max`` untuk menangkap dua ujung Hue.
        saturation_min: Ambang bawah Saturation.
        value_min: Ambang bawah Value.

    Returns:
        Mask biner kandidat tomat (array 2-D ``uint8``).
    """
    hsv_np = np.asarray(hsv_array)
    hue_min, hue_max = hue_range

    if hue_min <= hue_max:
        lower_bound = np.array([hue_min, saturation_min, value_min])
        upper_bound = np.array([hue_max, 255, 255])
        mask = cv2.inRange(hsv_np, lower_bound, upper_bound)
    else:
        # Rentang melingkar: gabungkan ujung atas (hue_min-179) dan ujung
        # bawah (0-hue_max) dengan operasi OR.
        lower_high = np.array([hue_min, saturation_min, value_min])
        upper_high = np.array([179, 255, 255])

        lower_low = np.array([0, saturation_min, value_min])
        upper_low = np.array([hue_max, 255, 255])

        mask = cv2.bitwise_or(
            cv2.inRange(hsv_np, lower_high, upper_high),
            cv2.inRange(hsv_np, lower_low, upper_low),
        )

    return mask