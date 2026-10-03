"""Tim 2: dataset tomat.

Sumber dataset (pilih salah satu, jangan campur tanpa alasan kuat):
- dataset publik (misalnya di Kaggle) yang sudah dilisensikan untuk penelitian,
- foto tomat sendiri dengan izin, untuk dataset terbatas.

Struktur folder yang diharapkan di `backend/datasets/`:

    datasets/
    |-- train/
    |   |-- mentah/
    |   |-- setengah_matang/
    |   `-- matang/
    |-- val/
    |   |-- mentah/
    |   |-- setengah_matang/
    |   `-- matang/
    `-- test/
        |-- mentah/
        |-- setengah_matang/
        `-- matang/

Nama folder harus sama dengan `settings.CLASS_NAMES`.
Dataset berukuran besar tidak di-commit ke Git, lihat `backend/.gitignore`.
"""

TODO = "Tim 2: isi model/dataset.py"


def build_datasets(data_dir=None, image_size: int = 224, batch_size: int = 32):
    """Siapkan data latih, validasi, dan uji.

    Args:
        data_dir: Folder dataset. Kalau `None`, pakai `settings.DATASET_DIR`.
        image_size: Ukuran input model, konsisten dengan `settings.IMAGE_SIZE`.
        batch_size: Jumlah citra per batch.

    Returns:
        Tuple (train_dataset, val_dataset, test_dataset).
    """
    raise NotImplementedError(TODO)


def class_counts(dataset) -> dict[str, int]:
    """Hitung jumlah citra per kelas, berguna untuk mengecek dataset imbalance."""
    raise NotImplementedError(TODO)