"""Test guard "khusus tomat" (geometri mask + keyakinan model)."""

import numpy as np
import pytest

pytest.importorskip("cv2", reason="opencv-python tidak terpasang")

import cv2

from app.core.config import settings
from app.services.tomato_guard import (
    NotATomatoError,
    ensure_tomato,
    shape_metrics,
)

PROBS_TOMAT = {"mentah": 0.05, "setengah_matang": 0.10, "matang": 0.85}


def _mask_lingkaran(size: int = 224, radius: int = 60) -> np.ndarray:
    mask = np.zeros((size, size), dtype=np.uint8)
    cv2.circle(mask, (size // 2, size // 2), radius, 255, -1)
    return mask


def test_objek_bulat_lolos() -> None:
    ensure_tomato(_mask_lingkaran(), PROBS_TOMAT)


def test_metrik_lingkaran_terhitung_benar() -> None:
    m = shape_metrics(_mask_lingkaran())
    assert m["circularity"] > 0.8
    assert 0.7 <= m["fill_ratio"] <= 0.85
    assert m["solidity"] > 0.95
    assert 0.03 < m["area_ratio"] < 0.85


def test_mask_kosong_ditolak() -> None:
    with pytest.raises(NotATomatoError):
        ensure_tomato(np.zeros((224, 224), dtype=np.uint8), PROBS_TOMAT)


def test_bentuk_lonjong_ditolak() -> None:
    mask = np.zeros((224, 224), dtype=np.uint8)
    cv2.rectangle(mask, (20, 100), (200, 120), 255, -1)
    with pytest.raises(NotATomatoError):
        ensure_tomato(mask, PROBS_TOMAT)


def test_keyakinan_rendah_ditolak() -> None:
    with pytest.raises(NotATomatoError):
        ensure_tomato(
            _mask_lingkaran(),
            {"mentah": 0.35, "setengah_matang": 0.30, "matang": 0.35},
        )


def test_hasil_ambigu_ditolak() -> None:
    # Lolos ambang keyakinan minimum, tetapi selisih top-1 vs top-2 kecil.
    with pytest.raises(NotATomatoError):
        ensure_tomato(
            _mask_lingkaran(),
            {"mentah": 0.40, "setengah_matang": 0.35, "matang": 0.25},
        )


def test_guard_bisa_dimatikan(monkeypatch) -> None:
    monkeypatch.setattr(settings, "TOMATO_GUARD_ENABLED", False)

    # Mask kosong + keyakinan rendah tetap lolos saat guard dimatikan.
    ensure_tomato(
        np.zeros((224, 224), dtype=np.uint8),
        {"mentah": 0.1, "setengah_matang": 0.1, "matang": 0.1},
    )
