"""Tahap 1: pra-pemrosesan citra.

Tanggung jawab:
- Membaca bytes gambar (hasil upload frontend) menjadi objek citra.
- Mengubahnya ke mode RGB.
- Menyesuaikan ukuran sesuai input model (lihat `settings.IMAGE_SIZE`).
- Perbaikan ringan: pengurangan noise (opsional, tidak dipakai pipeline utama).
"""

from __future__ import annotations

from PIL import Image
from io import BytesIO
import numpy as np
import cv2

from app.core.config import settings

__all__ = ["load_image_from_bytes", "denoise_image"]


def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """Ubah isi file gambar menjadi citra RGB berukuran sesuai model.

    Args:
        image_bytes: isi file gambar hasil upload pengguna.

    Returns:
        Citra RGB dengan ukuran `settings.IMAGE_SIZE` x `settings.IMAGE_SIZE`.
    """
    image = Image.open(BytesIO(image_bytes))

    if image.mode != "RGB":
        image = image.convert("RGB")

    image = image.resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE))

    return image


def denoise_image(image: Image.Image) -> Image.Image:
    """Kurangi noise tanpa membuat tepi tomat terlalu kabur.

    Memakai GaussianBlur ringan (kernel 3x3). Tidak dipakai pipeline utama
    karena model dilatih tanpa denoise; disediakan untuk eksperimen.
    """
    img_np = np.array(image)
    denoised_np = cv2.GaussianBlur(img_np, (3, 3), 0)
    return Image.fromarray(denoised_np)