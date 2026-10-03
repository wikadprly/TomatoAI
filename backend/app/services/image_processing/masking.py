"""Tahap 4 (Tim 1): masking.

Mengubah hasil thresholding menjadi mask final objek tomat, yaitu citra biner
yang hanya berisi 255 untuk piksel tomat dan 0 untuk piksel lainnya.
"""

from PIL import Image

TODO = "Tim 1: isi image_processing/masking.py"


def build_mask(
    candidate_mask: Image.Image,
    min_object_area: int = 500,
) -> Image.Image:
    """Bersihkan mask kandidat menjadi mask objek tomat.

    Args:
        candidate_mask: Mask biner dari `thresholding.threshold_hsv`.
        min_object_area: Luas minimum (piksel) agar sebuah blob dianggap tomat.

    Returns:
        Mask biner final, 255 untuk tomat dan 0 untuk latar belakang.
    """
    raise NotImplementedError(TODO)


def largest_object(mask: Image.Image) -> Image.Image:
    """Ambil hanya komponen terbesar sebagai objek tomat utama.

    Args:
        mask: Mask biner.

    Returns:
        Mask yang hanya menyisakan komponen terbesar.
    """
    raise NotImplementedError(TODO)


def apply_mask(image: Image.Image, mask: Image.Image) -> Image.Image:
    """Terapkan mask pada citra asli.

    Fungsi ini biasanya mengembalikan citra dengan area di luar mask
    menjadi hitam, yang kemudian dikirim ke model MobileNetV2.

    Args:
        image: Citra asli.
        mask: Mask biner hasil `build_mask`.

    Returns:
        Citra baru dengan area di luar mask menjadi hitam.
    """
    raise NotImplementedError(TODO)