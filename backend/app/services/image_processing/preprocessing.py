"""Tahap 1: pra-pemrosesan citra.

Tanggung jawab:
- Membaca bytes gambar (hasil upload frontend) menjadi objek citra.
- Mengubahnya ke mode RGB.
- Menyesuaikan ukuran sesuai input model (lihat `settings.IMAGE_SIZE`).
- Perbaikan ringan: pengurangan noise dan normalisasi pencahayaan.
"""

from PIL import Image
from io import BytesIO
import numpy as np
import cv2

from app.core.config import settings


def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """Ubah isi file gambar menjadi citra RGB berukuran sesuai model.

    Args:
        image_bytes: isi file gambar hasil upload pengguna.

    Returns:
        Citra RGB dengan ukuran `settings.IMAGE_SIZE` x `settings.IMAGE_SIZE`.
    """
    # Konversi bytes ke PIL Image
    image = Image.open(BytesIO(image_bytes))
    
    # Pastikan mode RGB (jika grayscale atau RGBA)
    if image.mode != "RGB":
        image = image.convert("RGB")
    
    # Resize sesuai ukuran input model
    image = image.resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE))
    
    return image


def resize_image(image: Image.Image, size: int | None = None) -> Image.Image:
    """Ubah ukuran citra.

    Args:
        image: Citra sumber.
        size: Sisi kuadrat tujuan. Kalau `None`, pakai `settings.IMAGE_SIZE`.

    Returns:
        Citra baru dengan ukuran `size` x `size`.
    """
    target_size = size if size is not None else settings.IMAGE_SIZE
    return image.resize((target_size, target_size))


def denoise_image(image: Image.Image) -> Image.Image:
    """Kurangi noise tanpa membuat tepi tomat terlalu kabur."""
    # Konversi PIL Image ke NumPy array
    img_np = np.array(image)
    
    # Menggunakan GaussianBlur ringan untuk mengurangi noise tanpa merusak tepi objek
    denoised_np = cv2.GaussianBlur(img_np, (3, 3), 0)
    
    # Kembalikan ke bentuk PIL Image
    return Image.fromarray(denoised_np)