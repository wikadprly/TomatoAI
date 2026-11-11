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
    assert 0.03 < m["area_ratio"] < 0.98


def test_objek_memenuhi_frame_lolos() -> None:
    # Regresi: foto close-up yang hampir memenuhi frame pernah ditolak
    # ("Objek terlalu memenuhi frame") meski jelas satu tomat.
    size = 224
    mask = np.zeros((size, size), dtype=np.uint8)
    cv2.rectangle(mask, (5, 5), (219, 219), 255, -1)
    ensure_tomato(mask, PROBS_TOMAT)


def test_bentuk_padat_tidak_sempurna_lolos() -> None:
    # Mask tomat nyata sering tidak bulat sempurna (tangkai / dua tomat
    # berdekatan). Bentuk padat berlekuk ringan harus tetap lolos.
    size = 224
    mask = np.zeros((size, size), dtype=np.uint8)
    pts = np.array(
        [[40, 110], [80, 60], [130, 55], [175, 95], [185, 150], [140, 190], [85, 180], [45, 150]],
        dtype=np.int32,
    )
    cv2.fillPoly(mask, [pts], 255)
    ensure_tomato(mask, PROBS_TOMAT)


def test_bentuk_tidak_padat_ditolak() -> None:
    # Bintang: berlekuk, tidak padat, area kecil — tetap harus ditolak.
    size = 224
    mask = np.zeros((size, size), dtype=np.uint8)
    c = (112, 112)
    pts = np.array(
        [
            [
                int(c[0] + (60 if i % 2 == 0 else 25) * np.cos(np.pi * i / 5)),
                int(c[1] + (60 if i % 2 == 0 else 25) * np.sin(np.pi * i / 5)),
            ]
            for i in range(10)
        ],
        dtype=np.int32,
    )
    cv2.fillPoly(mask, [pts], 255)
    with pytest.raises(NotATomatoError):
        ensure_tomato(mask, PROBS_TOMAT)


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


def test_prediksi_bukan_tomat_lolos_tanpa_geometri() -> None:
    # Kelas bukan_tomat memang tidak dilatih lewat mask tomat, jadi guard
    # dilewati sepenuhnya bila model memilih kelas itu.
    ensure_tomato(
        None,
        {"mentah": 0.05, "setengah_matang": 0.05, "matang": 0.10, "bukan_tomat": 0.80},
    )


def test_tetap_diperiksa_bila_bukan_tomat_bukan_teratas() -> None:
    # bukan_tomat ada tapi kalah: guard bentuk tetap berlaku.
    with pytest.raises(NotATomatoError):
        ensure_tomato(
            np.zeros((224, 224), dtype=np.uint8),
            {"mentah": 0.10, "setengah_matang": 0.10, "matang": 0.70, "bukan_tomat": 0.10},
        )
