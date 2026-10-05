"""Test untuk scripts/split_dataset.py.

Dataset bersih dibagi stratified per kelas ke train/val/test dengan rasio
bawaan 70:15:15 (keputusan tim, sesuai backend/datasets/README.md).
Pembagian harus reproducible (seed tetap) dan bebas kebocoran data:
tidak boleh ada citra yang sama muncul di dua split berbeda.
"""

import pytest

from scripts.split_dataset import split_dataset

JUMLAH_PER_KELAS = {"mentah": 20, "setengah_matang": 10, "matang": 10}


@pytest.fixture
def clean_dataset_dir(tmp_path):
    """Dataset bersih tiruan: 20 mentah, 10 setengah_matang, 10 matang."""
    clean = tmp_path / "clean"
    for kelas, jumlah in JUMLAH_PER_KELAS.items():
        folder = clean / kelas
        folder.mkdir(parents=True)
        for i in range(1, jumlah + 1):
            (folder / f"{kelas}_{i:03d}.jpg").write_bytes(b"citra")
    return clean


def _semua_berkas(output_dir):
    return {str(p.relative_to(output_dir)) for p in output_dir.rglob("*.jpg")}


def test_split_mengikuti_rasio_bawaan_70_15_15(clean_dataset_dir, tmp_path):
    report = split_dataset(clean_dataset_dir, tmp_path / "out")

    # Aturan pembulatan: train = floor(70%), val = floor(15%), test = sisanya.
    assert report["train"] == {"mentah": 14, "setengah_matang": 7, "matang": 7}
    assert report["val"] == {"mentah": 3, "setengah_matang": 1, "matang": 1}
    assert report["test"] == {"mentah": 3, "setengah_matang": 2, "matang": 2}


def test_split_menulis_struktur_folder_train_val_test(clean_dataset_dir, tmp_path):
    out = tmp_path / "out"
    split_dataset(clean_dataset_dir, out)

    for split in ("train", "val", "test"):
        for kelas in JUMLAH_PER_KELAS:
            assert (out / split / kelas).is_dir(), f"{split}/{kelas} hilang"


def test_split_tanpa_kebocoran_dan_tanpa_kehilangan_data(clean_dataset_dir, tmp_path):
    out = tmp_path / "out"
    split_dataset(clean_dataset_dir, out)

    per_split = {
        split: {p.name for p in (out / split).rglob("*.jpg")}
        for split in ("train", "val", "test")
    }
    # Anti-bocor: irisan antar-split harus kosong.
    assert per_split["train"] & per_split["val"] == set()
    assert per_split["train"] & per_split["test"] == set()
    assert per_split["val"] & per_split["test"] == set()

    # Tidak ada berkas yang hilang: gabungan = seluruh dataset bersih.
    total = sum(JUMLAH_PER_KELAS.values())
    assert len(_semua_berkas(out)) == total


def test_split_reproducible_dengan_seed_sama(clean_dataset_dir, tmp_path):
    split_dataset(clean_dataset_dir, tmp_path / "out1", seed=42)
    split_dataset(clean_dataset_dir, tmp_path / "out2", seed=42)

    assert _semua_berkas(tmp_path / "out1") == _semua_berkas(tmp_path / "out2")


def test_split_menerima_rasio_kustom(clean_dataset_dir, tmp_path):
    report = split_dataset(clean_dataset_dir, tmp_path / "out", ratios=(0.8, 0.1, 0.1))

    assert report["train"]["mentah"] == 16
    assert report["val"]["mentah"] == 2
    assert report["test"]["mentah"] == 2


def test_split_menolak_rasio_yang_tidak_berjumlah_satu(clean_dataset_dir, tmp_path):
    with pytest.raises(ValueError):
        split_dataset(clean_dataset_dir, tmp_path / "out", ratios=(0.5, 0.3, 0.1))
