"""Ubah artefak pengolahan citra menjadi data URL untuk dikirim ke browser.

Frontend perlu memperlihatkan *mengapa* model memutuskan sesuatu: mask HSV
yang terdeteksi, citra yang benar-benar diterima model, dan kontur objek di
atas foto asli. Modul ini yang mengubah ketiganya menjadi string ``data:``
supaya bisa langsung dipakai di atribut ``src`` tanpa endpoint terpisah.

Ukuran dijaga kecil: semua citra sudah 224x224, mask disimpan sebagai PNG
biner (lossless, beberapa KB) dan foto sebagai JPEG kualitas 80.
"""

from __future__ import annotations

import base64

import cv2
import numpy as np
from PIL import Image

__all__ = [
    "build_segmentation_images",
    "image_to_data_url",
    "mask_to_data_url",
    "overlay_to_data_url",
]

JPEG_QUALITY = 80


def _encode_jpeg(image: Image.Image) -> str:
    arr = np.asarray(image.convert("RGB"))[:, :, ::-1]  # RGB -> BGR untuk cv2
    ok, buffer = cv2.imencode(
        ".jpg", arr, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
    )
    if not ok:
        return ""
    return "data:image/jpeg;base64," + base64.b64encode(buffer.tobytes()).decode()


def image_to_data_url(image: Image.Image) -> str:
    """Citra RGB (PIL) -> data URL JPEG. String kosong bila gagal encode."""
    return _encode_jpeg(image)


def mask_to_data_url(mask: np.ndarray | None) -> str:
    """Mask biner -> data URL PNG hitam-putih. String kosong bila mask kosong."""
    if mask is None:
        return ""

    binary = (np.asarray(mask) > 0).astype(np.uint8) * 255
    if binary.size == 0 or binary.max() == 0:
        return ""

    ok, buffer = cv2.imencode(".png", binary)
    if not ok:
        return ""
    return "data:image/png;base64," + base64.b64encode(buffer.tobytes()).decode()


def overlay_to_data_url(image: Image.Image, mask: np.ndarray | None) -> str:
    """Foto asli + kontur hijau objek yang terdeteksi -> data URL JPEG."""
    rgb = np.asarray(image.convert("RGB")).copy()
    if mask is not None:
        binary = (np.asarray(mask) > 0).astype(np.uint8)
        if binary.shape[:2] == rgb.shape[:2] and binary.max() > 0:
            contours, _ = cv2.findContours(
                binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            # Gambar di layer RGBA supaya area objek bisa diberi tint tanpa
            # menutupi detail foto aslinya.
            overlay = rgb.copy()
            cv2.drawContours(overlay, contours, -1, (63, 125, 88), 2)
            cv2.drawContours(overlay, contours, -1, (255, 255, 255), 4)
            rgb = cv2.addWeighted(overlay, 0.85, rgb, 0.15, 0)

    ok, buffer = cv2.imencode(
        ".jpg", rgb[:, :, ::-1], [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
    )
    if not ok:
        return ""
    return "data:image/jpeg;base64," + base64.b64encode(buffer.tobytes()).decode()


def build_segmentation_images(
    model_input: Image.Image,
    mask: np.ndarray | None,
    original_resized: Image.Image,
):
    """Bangun paket visual segmentasi untuk respons API.

    Args:
        model_input: Citra yang benar-benar dikirim ke MobileNetV2.
        mask: Mask biner objek (boleh ``None``).
        original_resized: Foto asli pada resolusi yang sama dengan mask.

    Returns:
        ``SegmentationImages`` atau ``None`` bila semua encode gagal.
    """
    from app.schemas.prediction import SegmentationImages

    mask_url = mask_to_data_url(mask)
    model_url = image_to_data_url(model_input)
    overlay_url = overlay_to_data_url(original_resized, mask)

    if not (mask_url or model_url or overlay_url):
        return None

    return SegmentationImages(
        mask_png=mask_url or None,
        model_input_jpeg=model_url or None,
        overlay_jpeg=overlay_url or None,
    )
