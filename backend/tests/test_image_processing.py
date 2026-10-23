"""Test untuk modul pengolahan citra.

Menguji thresholding (termasuk rentang Hue melingkar), segmentasi objek,
dan analisis warna. Membutuhkan numpy + opencv-python; di mesin tanpa
keduanya test ini di-skip otomatis.
"""

import pytest

pytest.importorskip("cv2", reason="opencv-python tidak terpasang")
np = pytest.importorskip("numpy", reason="numpy tidak terpasang")

from PIL import Image, ImageDraw

from app.services.image_processing import color_analysis, segmentation, thresholding


def _buat_gambar_lingkaran_merah(size: int = 224) -> Image.Image:
    """Citra uji: lingkaran merah di atas latar abu-abu terang."""
    citra = Image.new("RGB", (size, size), (240, 240, 240))
    gambar = ImageDraw.Draw(citra)
    margin = size // 4
    gambar.ellipse([margin, margin, size - margin, size - margin], fill=(220, 30, 30))
    return citra


# --- thresholding -----------------------------------------------------------

def test_threshold_hsv_rentang_normal():
    hsv = np.zeros((1, 3, 3), dtype=np.uint8)
    hsv[0, 0] = [10, 200, 200]   # dalam rentang
    hsv[0, 1] = [100, 200, 200]  # di luar rentang
    hsv[0, 2] = [30, 200, 200]   # di luar rentang

    mask = thresholding.threshold_hsv(hsv, (0, 20), 50, 50)

    assert mask[0, 0] == 255
    assert mask[0, 1] == 0
    assert mask[0, 2] == 0


def test_threshold_hsv_rentang_melingkar_menangkap_dua_ujung():
    hsv = np.zeros((1, 2, 3), dtype=np.uint8)
    hsv[0, 0] = [5, 200, 200]    # merah di ujung bawah Hue
    hsv[0, 1] = [175, 200, 200]  # merah di ujung atas Hue

    mask = thresholding.threshold_hsv(hsv, (160, 20), 50, 50)

    assert mask[0, 0] == 255
    assert mask[0, 1] == 255


# --- segmentasi -------------------------------------------------------------

def test_segmentasi_menemukan_objek_dan_mask():
    citra = _buat_gambar_lingkaran_merah()

    segmented, mask, hsv = segmentation.segment_tomato_with_mask(citra)

    assert np.count_nonzero(mask) > 0
    assert segmented.size == citra.size
    assert hsv.shape[:2] == citra.size[::-1]


def _buat_gambar_lingkaran_warna(warna, size: int = 224) -> Image.Image:
    """Citra uji: lingkaran berwarna tertentu di atas latar abu-abu terang."""
    citra = Image.new("RGB", (size, size), (240, 240, 240))
    gambar = ImageDraw.Draw(citra)
    margin = size // 4
    gambar.ellipse([margin, margin, size - margin, size - margin], fill=warna)
    return citra


def test_segmentasi_menangkap_tomat_hijau_dan_kuning():
    """Tomat mentah (hijau) dan setengah matang (kuning) harus ikut
    tersegmentasi — bukan hanya merah/jingga seperti versi lama."""
    for warna in [(60, 160, 60), (230, 210, 60)]:
        citra = _buat_gambar_lingkaran_warna(warna)

        _, mask, hsv = segmentation.segment_tomato_with_mask(citra)

        assert np.count_nonzero(mask) > 0, f"warna {warna} tidak tersegmentasi"
        hasil = color_analysis.analyze_color(mask, hsv)
        assert hasil is not None


def test_segment_tomato_mengembalikan_citra_saja():
    citra = _buat_gambar_lingkaran_merah()

    hasil = segmentation.segment_tomato(citra)

    assert hasil.size == citra.size


# --- analisis warna ---------------------------------------------------------

def test_analisis_warna_mengisi_statistik():
    citra = _buat_gambar_lingkaran_merah()
    _, mask, hsv = segmentation.segment_tomato_with_mask(citra)

    hasil = color_analysis.analyze_color(mask, hsv)

    assert hasil is not None
    assert 0.0 < hasil.object_ratio < 1.0
    assert hasil.mean_saturation > 0


def test_analisis_warna_none_saat_mask_kosong():
    mask = np.zeros((10, 10), dtype=np.uint8)
    hsv = np.zeros((10, 10, 3), dtype=np.uint8)

    assert color_analysis.analyze_color(mask, hsv) is None


def test_object_ratio():
    mask = np.zeros((10, 10), dtype=np.uint8)
    mask[:5, :] = 255  # separuh area

    assert color_analysis.object_ratio(mask) == pytest.approx(0.5)
