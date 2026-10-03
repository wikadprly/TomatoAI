"""Tahap 1 (Tim 1): pra-pemrosesan citra.

Tanggung jawab:
- Membaca bytes gambar (hasil upload frontend) menjadi objek citra.
- Mengubahnya ke mode RGB.
- Menyesuaikan ukuran sesuai input model (lihat `settings.IMAGE_SIZE`).
- Perbaikan ringan: pengurangan noise dan normalisasi pencahayaan.
"""

from PIL import Image

from app.core.config import settings

TODO = "Tim 1: isi image_processing/preprocessing.py"


def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """Ubah isi file gambar menjadi citra RGB berukuran sesuai model.

    Args:
        image_bytes: isi file gambar hasil upload pengguna.

    Returns:
        Citra RGB dengan ukuran `settings.IMAGE_SIZE` x `settings.IMAGE_SIZE`.
    """
    raise NotImplementedError(TODO)


def resize_image(image: Image.Image, size: int | None = None) -> Image.Image:
    """Ubah ukuran citra.

    Args:
        image: Citra sumber.
        size: Sisi kuadrat tujuan. Kalau `None`, pakai `settings.IMAGE_SIZE`.

    Returns:
        Citra baru dengan ukuran `size` x `size`.
    """
    raise NotImplementedError(TODO)


def denoise_image(image: Image.Image) -> Image.Image:
    """Kurangi noise tanpa membuat tepi tomat terlalu kabur."""
    raise NotImplementedError(TODO)