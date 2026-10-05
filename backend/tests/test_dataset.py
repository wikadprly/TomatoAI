"""Test untuk app/services/model/dataset.py.

class_counts diuji tanpa TensorFlow (objek tiruan sederhana).
build_datasets butuh TensorFlow; di mesin tanpa TF test-nya di-skip
otomatis dan wajib dijalankan di environment training (Colab / py3.12).
"""

from types import SimpleNamespace

import pytest
from PIL import Image

from app.services.model.dataset import build_datasets, class_counts


# --- class_counts (tanpa TensorFlow) ---------------------------------------

def test_class_counts_menghitung_sampel_per_kelas():
    generator_tiruan = SimpleNamespace(
        class_indices={"mentah": 0, "setengah_matang": 1, "matang": 2},
        classes=[0, 0, 0, 1, 1, 2, 2, 2, 2],
    )

    assert class_counts(generator_tiruan) == {
        "mentah": 3,
        "setengah_matang": 2,
        "matang": 4,
    }


# --- build_datasets (butuh TensorFlow, skip bila tidak ada) -----------------

@pytest.fixture
def tf():
    """TensorFlow hanya ada di environment training (Colab / Python <=3.12)."""
    return pytest.importorskip("tensorflow", reason="TensorFlow tidak terpasang di mesin ini")


@pytest.fixture
def pohon_dataset(tmp_path):
    """Struktur datasets/{train,val,test}/<3 kelas> berisi citra kecil."""
    for split in ("train", "val", "test"):
        for kelas in ("mentah", "setengah_matang", "matang"):
            folder = tmp_path / split / kelas
            folder.mkdir(parents=True)
            for i in range(4):
                Image.new("RGB", (8, 8), (i * 10, 100, 50)).save(
                    folder / f"{kelas}_{i}.jpg"
                )
    return tmp_path


def test_build_datasets_membaca_tiga_split_dan_tiga_kelas(tf, pohon_dataset):
    train_ds, val_ds, test_ds = build_datasets(
        data_dir=pohon_dataset, image_size=64, batch_size=2
    )

    assert train_ds.samples == 12
    assert val_ds.samples == 12
    assert test_ds.samples == 12
    assert set(train_ds.class_indices) == {"mentah", "setengah_matang", "matang"}


def test_build_datasets_batch_berbentuk_tensor_kategorikal(tf, pohon_dataset):
    train_ds, _, _ = build_datasets(data_dir=pohon_dataset, image_size=64, batch_size=2)

    gambar, label = next(iter(train_ds))
    assert tuple(gambar.shape) == (2, 64, 64, 3)
    assert tuple(label.shape) == (2, 3)  # one-hot 3 kelas, class_mode='categorical'
    assert float(gambar.max()) <= 1.0  # rescale=1./255 aktif


def test_build_datasets_augmentasi_hanya_di_train(tf, pohon_dataset):
    train_ds, val_ds, test_ds = build_datasets(
        data_dir=pohon_dataset, image_size=64, batch_size=2
    )

    # Train: augmentasi sesuai parameter proyek.
    gen_train = train_ds.image_data_generator
    assert gen_train.rotation_range == 20
    assert gen_train.shear_range == 0.2
    assert gen_train.zoom_range == 0.2
    assert gen_train.horizontal_flip is True

    # Val/test: hanya rescale, tanpa augmentasi.
    for ds in (val_ds, test_ds):
        gen = ds.image_data_generator
        assert not gen.shear_range
        assert not gen.zoom_range
        assert not gen.horizontal_flip
        assert not gen.rotation_range
        assert gen.rescale == pytest.approx(1.0 / 255)
