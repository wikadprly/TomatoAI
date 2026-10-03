"""Tahap 5 (Tim 1): morphology.

Operasi matematis pada mask untuk membersihkan noise:
- opening (erosi lalu dilasi): membuang piksel noise kecil.
- closing (dilasi lalu erosi): menutup lubang kecil pada area tomat.
"""

from PIL import Image

TODO = "Tim 1: isi image_processing/morphology.py"


def apply_morphology(mask: Image.Image, kernel_size: int = 3) -> Image.Image:
    """Terapkan opening lalu closing pada mask.

    Args:
        mask: Mask biner dari `masking.build_mask`.
        kernel_size: Ukuran kernel structuring element (harus ganjil).

    Returns:
        Mask biner yang sudah bersih.
    """
    raise NotImplementedError(TODO)


def open_mask(mask: Image.Image, kernel_size: int = 3) -> Image.Image:
    """Opening: buang noise sekecil kecilannya."""
    raise NotImplementedError(TODO)


def close_mask(mask: Image.Image, kernel_size: int = 3) -> Image.Image:
    """Closing: tutup lubang kecil pada objek tomat."""
    raise NotImplementedError(TODO)