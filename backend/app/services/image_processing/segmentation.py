"""Tahap 6 (Tim 1): segmentasi objek tomat.

Menggabungkan seluruh tahap sebelumnya menjadi satu fungsi yang mengembalikan
citra tomat yang sudah terisolasi dari latar belakang, siap dikirim ke model.
"""

from PIL import Image

TODO = "Tim 1: isi image_processing/segmentation.py"


def segment_tomato(
    image: Image.Image,
    hsv_image: Image.Image | None = None,
) -> Image.Image:
    """Jalankan seluruh rantai pemrosesan untuk satu citra.

    Urutan: RGB -> HSV -> thresholding -> masking -> morphology -> apply mask.

    Args:
        image: Citra RGB hasil pra-pemrosesan.
        hsv_image: Citra HSV kalau sudah dihitung sebelumnya, agar tidak diulang.

    Returns:
        Citra tomat yang sudah terisolasi dari latar belakang.
    """
    raise NotImplementedError(TODO)


def bounding_box(mask: Image.Image) -> tuple[int, int, int, int] | None:
    """Ambil kotak pembatas objek tomat.

    Berguna bila model perlu potongan objek yang tightly cropped.

    Args:
        mask: Mask biner objek tomat.

    Returns:
        Tuple (x, y, width, height), atau `None` bila mask kosong.
    """
    raise NotImplementedError(TODO)