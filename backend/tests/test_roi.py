"""Test pemilihan input model dari hasil pengolahan citra (mode ROI)."""

import numpy as np
from PIL import Image

from app.services.image_processing.roi import crop_to_mask, prepare_model_input


def _mask_persegi(
    size: int = 100, box: tuple[int, int, int, int] = (20, 30, 60, 70)
) -> np.ndarray:
    mask = np.zeros((size, size), dtype=np.uint8)
    x1, y1, x2, y2 = box
    mask[y1:y2, x1:x2] = 255
    return mask


def test_crop_memakai_bbox_dan_margin() -> None:
    citra = Image.new("RGB", (200, 200), (255, 255, 255))
    # Mask 100x100 diskalakan 2x -> bbox (40, 60, 120, 140), sisi 80.
    # Margin 15% dari 80 = 12 px di setiap sisi.
    hasil = crop_to_mask(citra, _mask_persegi(), margin_ratio=0.15)

    assert hasil.size == (80 + 24, 80 + 24)


def test_crop_dibatasi_tepi_citra() -> None:
    citra = Image.new("RGB", (100, 100), (255, 255, 255))
    mask = _mask_persegi(box=(0, 0, 100, 100))
    hasil = crop_to_mask(citra, mask, margin_ratio=0.5)

    assert hasil.size == (100, 100)


def test_crop_mask_kosong_mengembalikan_citra_asli() -> None:
    citra = Image.new("RGB", (80, 60), (10, 20, 30))
    hasil = crop_to_mask(citra, np.zeros((100, 100), dtype=np.uint8))

    assert hasil is citra


def test_prepare_original_mengembalikan_citra_resized() -> None:
    raw = Image.new("RGB", (400, 300), (1, 2, 3))
    resized = raw.resize((224, 224))
    segmented = Image.new("RGB", (224, 224), (0, 0, 0))

    hasil = prepare_model_input(
        raw, resized, segmented, _mask_persegi(size=224), mode="original"
    )

    assert hasil is resized


def test_prepare_segment_mengembalikan_citra_masking() -> None:
    raw = Image.new("RGB", (400, 300), (1, 2, 3))
    resized = raw.resize((224, 224))
    segmented = Image.new("RGB", (224, 224), (0, 0, 0))

    hasil = prepare_model_input(
        raw, resized, segmented, _mask_persegi(size=224), mode="segment"
    )

    assert hasil is segmented


def test_prepare_crop_resize_ke_ukuran_model() -> None:
    raw = Image.new("RGB", (400, 300), (1, 2, 3))
    resized = raw.resize((224, 224))
    segmented = Image.new("RGB", (224, 224), (0, 0, 0))

    hasil = prepare_model_input(
        raw,
        resized,
        segmented,
        _mask_persegi(size=224),
        mode="crop",
        margin_ratio=0.15,
    )

    assert hasil.size == (224, 224)
    assert hasil is not resized


def test_mode_tak_dikenal_dianggap_original() -> None:
    raw = Image.new("RGB", (400, 300), (1, 2, 3))
    resized = raw.resize((224, 224))
    segmented = Image.new("RGB", (224, 224), (0, 0, 0))

    hasil = prepare_model_input(
        raw, resized, segmented, _mask_persegi(size=224), mode="xyz"
    )

    assert hasil is resized
