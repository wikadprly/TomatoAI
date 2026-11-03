"""Pemilihan input model dari hasil pengolahan citra.

Pipeline bisa memakai tiga mode input (diatur lewat ``INFERENCE_INPUT_MODE``):

- ``original``: citra 224x224 apa adanya. Ini distribusi saat model dilatih,
  jadi default-nya masih mode ini sampai evaluasi test set membuktikan mode
  lain lebih baik/setara.
- ``crop``: potong area objek tomat memakai bounding box mask (ditambah
  margin), diambil dari citra resolusi penuh agar detail tidak hilang.
- ``segment``: citra hasil masking (latar belakang hitam) yang sudah siap.

Modul ini dipakai bersama oleh pipeline prediksi dan skrip evaluasi supaya
perbandingan mode memakai logika yang persis sama.
"""

from __future__ import annotations

import numpy as np
from PIL import Image

__all__ = ["crop_to_mask", "prepare_model_input"]

VALID_MODES = ("original", "crop", "segment")


def _bbox_from_mask(mask: np.ndarray) -> tuple[int, int, int, int] | None:
    """Kembalikan ``(x1, y1, x2, y2)`` area putih mask, atau None bila kosong."""
    mask_array = np.asarray(mask)
    if mask_array.ndim != 2:
        return None

    ys, xs = np.where(mask_array > 0)
    if xs.size == 0:
        return None

    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def crop_to_mask(
    image: Image.Image,
    mask: np.ndarray,
    margin_ratio: float = 0.15,
) -> Image.Image:
    """Potong citra pada bounding box mask, diperluas sedikit (margin).

    Koordinat mask dipetakan ke resolusi ``image``, sehingga mask boleh
    dihitung pada citra yang sudah di-resize (mis. 224x224) sementara potongan
    tetap diambil dari citra resolusi penuh.

    Args:
        image: Citra RGB sumber (idealnya resolusi penuh).
        mask: Mask biner objek tomat, boleh berbeda ukuran dengan ``image``.
        margin_ratio: Margin tambahan relatif terhadap sisi terpanjang bbox.

    Returns:
        Citra hasil potong. Bila mask kosong/tidak valid, citra asli
        dikembalikan supaya pipeline tidak gagal (guard akan menolaknya).
    """
    bbox = _bbox_from_mask(mask)
    if bbox is None:
        return image

    width, height = image.size
    mask_height, mask_width = np.asarray(mask).shape[:2]
    if mask_width == 0 or mask_height == 0:
        return image

    x1, y1, x2, y2 = bbox
    scale_x = width / mask_width
    scale_y = height / mask_height

    x1 = max(0, min(width, int(x1 * scale_x)))
    y1 = max(0, min(height, int(y1 * scale_y)))
    x2 = max(0, min(width, int(round(x2 * scale_x))))
    y2 = max(0, min(height, int(round(y2 * scale_y))))

    if x2 <= x1 or y2 <= y1:
        return image

    margin = int(round(max(x2 - x1, y2 - y1) * max(0.0, margin_ratio)))
    x1 = max(0, x1 - margin)
    y1 = max(0, y1 - margin)
    x2 = min(width, x2 + margin)
    y2 = min(height, y2 + margin)

    return image.crop((x1, y1, x2, y2))


def prepare_model_input(
    image_raw: Image.Image,
    image_resized: Image.Image,
    segmented_image: Image.Image,
    mask: np.ndarray,
    mode: str = "original",
    margin_ratio: float = 0.15,
) -> Image.Image:
    """Pilih citra yang dikirim ke model sesuai mode konfigurasi.

    Args:
        image_raw: Citra RGB resolusi penuh (untuk mode ``crop``).
        image_resized: Citra RGB yang sudah di-resize ke ukuran model.
        segmented_image: Citra hasil masking (latar belakang hitam).
        mask: Mask objek tomat.
        mode: ``original``, ``crop``, atau ``segment``. Nilai tak dikenal
            diperlakukan sebagai ``original``.
        margin_ratio: Margin crop relatif terhadap bbox.

    Returns:
        Citra RGB siap dikirim ke model. Untuk ``crop``, hasil potongan
        di-resize ke ukuran ``image_resized``.
    """
    if mode == "segment":
        return segmented_image

    if mode == "crop":
        cropped = crop_to_mask(image_raw, mask, margin_ratio)
        return cropped.resize(image_resized.size)

    return image_resized
