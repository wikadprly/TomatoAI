"""Tahap 3: thresholding.

Memisahkan piksel tomat dari latar belakang berdasarkan ambang (threshold)
pada kanal Hue, Saturation, dan Value hasil konversi HSV.
"""

from PIL import Image

TODO = "Isi image_processing/thresholding.py"


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
    raise NotImplementedError(TODO)


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
    raise NotImplementedError(TODO)