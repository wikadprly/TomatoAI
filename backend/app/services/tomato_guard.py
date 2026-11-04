"""Guard sederhana untuk memastikan objek yang diprediksi memang tomat.

Ini **bukan model pembelajaran**. Ia memakai geometri mask segmentasi dan
keyakinan model untuk menyaring kasus yang jelas bukan tomat (pemandangan,
orang, objek non-bulat) serta prediksi yang ragu.

Batasannya jujur: guard ini tetap lapisan pengaman, bukan pengganti model.
Model kini punya kelas keempat ``bukan_tomat`` sehingga jeruk/apel/objek
lain biasanya langsung ditolak oleh model. Guard tetap menangani kasus yang
lolos model: mask kosong, objek bukan satu tomat, atau prediksi yang ragu.
Bila prediksi teratas adalah ``bukan_tomat``, validasi bentuk dilewati —
kelas itu memang tidak dilatih lewat mask tomat.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.core.config import settings

__all__ = ["NotATomatoError", "ensure_tomato", "shape_metrics"]


class NotATomatoError(ValueError):
    """Gambar tidak memenuhi syarat sebagai satu objek tomat yang valid."""


def shape_metrics(mask: np.ndarray) -> dict[str, float]:
    """Hitung metrik bentuk dari mask biner objek utama.

    Returns:
        Dict berisi ``area_ratio``, ``circularity``, ``fill_ratio``,
        ``solidity``, dan ``aspect_ratio``. Semua 0.0 bila mask kosong.
    """
    mask_np = np.asarray(mask)
    kosong = {
        "area_ratio": 0.0,
        "circularity": 0.0,
        "fill_ratio": 0.0,
        "solidity": 0.0,
        "aspect_ratio": 0.0,
    }

    if mask_np.size == 0:
        return kosong

    if mask_np.ndim != 2:
        mask_np = cv2.cvtColor(mask_np, cv2.COLOR_BGR2GRAY)

    binary = (mask_np > 0).astype(np.uint8)
    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if not contours:
        return kosong

    contour = max(contours, key=cv2.contourArea)
    area = float(cv2.contourArea(contour))
    if area <= 0:
        return kosong

    perimeter = float(cv2.arcLength(contour, True))
    x, y, w, h = cv2.boundingRect(contour)
    bbox_area = float(w * h)

    hull_area = float(cv2.contourArea(cv2.convexHull(contour)))
    total_pixels = float(mask_np.shape[0] * mask_np.shape[1])

    return {
        # 4*pi*A / P^2 -> 1.0 untuk lingkaran sempurna.
        "circularity": 0.0
        if perimeter <= 0
        else float(4.0 * np.pi * area / (perimeter**2)),
        # Seberapa penuh kontur mengisi bounding box-nya (lingkaran ~0.785).
        "fill_ratio": 0.0 if bbox_area <= 0 else area / bbox_area,
        # area kontur / area convex hull; rendah bila bentuk berlekuk.
        "solidity": 0.0 if hull_area <= 0 else area / hull_area,
        "aspect_ratio": 0.0 if h <= 0 else float(w) / float(h),
        "area_ratio": 0.0 if total_pixels <= 0 else area / total_pixels,
    }


def _periksa_keyakinan(probabilities: dict[str, float]) -> None:
    if not probabilities:
        raise NotATomatoError(
            "Model tidak menghasilkan probabilitas kelas. Coba unggah ulang foto."
        )

    urut = sorted(probabilities.values(), reverse=True)
    teratas = float(urut[0])
    kedua = float(urut[1]) if len(urut) > 1 else 0.0

    if teratas < settings.MIN_MODEL_CONFIDENCE:
        raise NotATomatoError(
            "Model tidak cukup yakin gambar ini berisi tomat "
            f"(keyakinan {teratas:.0%}). Pastikan satu tomat terlihat jelas."
        )

    if teratas - kedua < settings.MIN_CONFIDENCE_MARGIN:
        raise NotATomatoError(
            "Hasil model terlalu ambigu untuk dipastikan sebagai tomat. "
            "Gunakan foto satu tomat dengan latar polos dan pencahayaan cukup."
        )


def _periksa_bentuk(mask: np.ndarray | None) -> None:
    if mask is None:
        raise NotATomatoError(
            "Objek tomat tidak terdeteksi. Pastikan foto berisi satu tomat "
            "di atas latar belakang polos dengan kontras yang cukup."
        )

    m = shape_metrics(mask)

    if m["area_ratio"] < settings.MIN_OBJECT_RATIO:
        raise NotATomatoError(
            "Objek tomat terlalu kecil atau tidak terdeteksi. "
            "Dekatkan kamera ke satu tomat."
        )

    if m["area_ratio"] > settings.MAX_OBJECT_RATIO:
        raise NotATomatoError(
            "Objek terlalu memenuhi frame. Sisakan latar belakang polos "
            "agar tomat bisa dikenali."
        )

    if m["circularity"] < settings.MIN_CIRCULARITY:
        raise NotATomatoError(
            "Bentuk objek tidak menyerupai tomat (tidak cukup bulat)."
        )

    if m["fill_ratio"] < settings.MIN_FILL_RATIO:
        raise NotATomatoError(
            "Bentuk objek tidak menyerupai tomat (siluet terlalu berlekuk)."
        )

    if m["solidity"] < settings.MIN_SOLIDITY:
        raise NotATomatoError(
            "Bentuk objek tidak menyerupai tomat (siluet tidak padat)."
        )

    if (
        m["aspect_ratio"] < settings.MIN_ASPECT_RATIO
        or m["aspect_ratio"] > settings.MAX_ASPECT_RATIO
    ):
        raise NotATomatoError(
            "Proporsi objek tidak menyerupai tomat (terlalu lonjong/pipih)."
        )


def ensure_tomato(
    mask: np.ndarray | None,
    probabilities: dict[str, float],
) -> None:
    """Validasi bahwa gambar layak diprediksi sebagai tomat.

    Args:
        mask: Mask objek terbesar hasil segmentasi (atau ``None``).
        probabilities: Probabilitas per kelas dari model.

    Raises:
        NotATomatoError: bila gambar tidak lolos batasan lingkungan tomat.
    """
    if not settings.TOMATO_GUARD_ENABLED:
        return

    # Prediksi teratas bukan_tomat: lewati validasi bentuk, karena kelas ini
    # dilatih dari foto buah utuh, bukan dari mask segmentasi tomat.
    if probabilities.get("bukan_tomat", 0) == max(probabilities.values(), default=0):
        return

    _periksa_bentuk(mask)
    _periksa_keyakinan(probabilities)
