"""Test untuk scripts/clean_dataset.py.

Dataset mentah dari Kaggle sering berantakan: nama folder kelas tidak konsisten,
ada file corrupt, duplikat, dan format campuran (RGBA, PNG, dsb).
Script cleaning harus menormalkan semuanya menjadi:
    datasets/clean/<kelas_kanonik>/<kelas>_001.jpg (RGB JPEG)
"""

import shutil

import pytest
from PIL import Image

from scripts.clean_dataset import clean_dataset


def _buat_citra(path, warna=(200, 30, 30), mode="RGB") -> None:
    """Buat citra kecil valid untuk fixture."""
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new(mode, (16, 16), warna).save(path)


@pytest.fixture
def raw_dataset(tmp_path):
    """Dataset mentah tiruan dengan segala jenis kekacauan."""
    raw = tmp_path / "raw"

    # Kelas mentah: 2 unik + 1 duplikat persis + 1 corrupt + 1 bukan citra
    _buat_citra(raw / "unripe" / "a.jpg", warna=(0, 200, 0))
    _buat_citra(raw / "unripe" / "b.jpg", warna=(0, 180, 10))
    shutil.copy(raw / "unripe" / "a.jpg", raw / "unripe" / "a_copy.jpg")
    (raw / "unripe" / "rusak.jpg").write_bytes(b"ini bukan citra sama sekali")
    (raw / "unripe" / "catatan.txt").write_text("bukan citra")

    # Alias nama folder lain untuk mentah
    _buat_citra(raw / "green" / "c.jpg", warna=(10, 220, 10))

    # Kelas setengah_matang: dua alias + satu citra RGBA (png)
    _buat_citra(raw / "half_ripe" / "d.png", warna=(255, 165, 0), mode="RGBA")
    _buat_citra(raw / "Breaker" / "e.jpg", warna=(250, 140, 20))

    # Kelas matang: nama folder dengan spasi dan huruf besar/kecil campur
    _buat_citra(raw / "Fully Ripened" / "f.jpg", warna=(220, 0, 0))
    _buat_citra(raw / "fully ripened" / "g.jpg", warna=(180, 10, 10))

    # Folder yang tidak dikenal harus dilaporkan, bukan diam-diam diproses
    _buat_citra(raw / "foto_liburan" / "h.jpg", warna=(1, 2, 3))

    return raw


def test_clean_dataset_menghitung_tiap_kelas_dengan_benar(raw_dataset, tmp_path):
    report = clean_dataset(raw_dataset, tmp_path / "clean", tmp_path / "quarantine")

    assert report["mentah"] == 3  # a, b (a_copy duplikat), c dari folder green
    assert report["setengah_matang"] == 2  # d (RGBA), e (Breaker)
    assert report["matang"] == 2  # f, g
    assert report["corrupt"] == 1  # rusak.jpg
    assert report["duplicates"] == 1  # a_copy.jpg identik dengan a.jpg
    assert report["non_image"] == 1  # catatan.txt
    assert report["skipped_unknown"] == 1  # folder foto_liburan


def test_clean_dataset_menulis_citra_rgb_jpeg_bernama_sekuensial(raw_dataset, tmp_path):
    clean = tmp_path / "clean"
    clean_dataset(raw_dataset, clean, tmp_path / "quarantine")

    files = sorted((clean / "mentah").iterdir())
    assert [f.name for f in files] == ["mentah_001.jpg", "mentah_002.jpg", "mentah_003.jpg"]

    for kelas_dir in clean.iterdir():
        for file in kelas_dir.iterdir():
            with Image.open(file) as img:
                assert img.mode == "RGB"
                assert img.format == "JPEG"


def test_clean_dataset_mengkarantina_file_corrupt(raw_dataset, tmp_path):
    quarantine = tmp_path / "quarantine"
    clean_dataset(raw_dataset, tmp_path / "clean", quarantine)

    corrupt_files = list(quarantine.rglob("rusak.jpg"))
    assert len(corrupt_files) == 1


def test_clean_dataset_menolak_folder_mentah_yang_tidak_ada(tmp_path):
    with pytest.raises(FileNotFoundError):
        clean_dataset(tmp_path / "tidak_ada", tmp_path / "clean", tmp_path / "quarantine")


def test_clean_dataset_menemukan_kelas_di_folder_bersarang(tmp_path):
    """Struktur ala dataset Kaggle: raw/train/<kelas>/, raw/val/<kelas>/.

    Folder pembungkus (train/val/test) bukan kelas, jadi harus dilalui
    sampai folder bernama alias kelas ditemukan.
    """
    raw = tmp_path / "raw"
    # Warna beda per citra supaya tidak kena dedup MD5.
    for split, warna in zip(
        ("train", "val", "test"), [(0, 90, 0), (10, 100, 5), (20, 110, 10)]
    ):
        _buat_citra(raw / split / "unripe" / f"{split}_1.jpg", warna=warna)
    _buat_citra(raw / "test" / "Fully Ripened" / "test_2.jpg", warna=(200, 0, 0))

    report = clean_dataset(raw, tmp_path / "clean", tmp_path / "quarantine")

    assert report["mentah"] == 3
    assert report["matang"] == 1
    assert report["skipped_unknown"] == 0
