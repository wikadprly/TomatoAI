"""Dataset tomat.

Sumber dataset (pilih salah satu, jangan campur tanpa alasan kuat):
- dataset publik (misalnya di Kaggle) yang sudah dilisensikan untuk penelitian,
- foto tomat sendiri dengan izin, untuk dataset terbatas.

Struktur folder yang diharapkan di `backend/datasets/` (dibuat oleh
`scripts/split_dataset.py` dengan rasio bawaan 70:15:15):

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

TensorFlow diimpor secara lazy di dalam fungsi supaya modul ini tetap bisa
diimpor (dan dites) di mesin tanpa TensorFlow, misalnya saat development
backend tanpa GPU/TF.
"""

from collections import Counter
from pathlib import Path

from app.core.config import settings

# Parameter augmentasi real-time (hanya untuk data train).
# Hanya dipakai untuk data train; val/test cukup rescale.
TRAIN_AUGMENTATION = {
    "rescale": 1.0 / 255,
    "rotation_range": 20,
    "shear_range": 0.2,
    "zoom_range": 0.2,
    "horizontal_flip": True,
    "fill_mode": "nearest",
}
EVAL_AUGMENTATION = {"rescale": 1.0 / 255}


def build_datasets(data_dir=None, image_size: int = 224, batch_size: int = 32):
    """Siapkan data latih, validasi, dan uji.

    Data train diaugmentasi real-time (rotasi, shear, zoom, horizontal flip)
    dengan class_mode='categorical' untuk output softmax 3 kelas.
    Data val/test hanya di-rescale dan tidak di-shuffle supaya urutan
    prediksi sejajar dengan label saat evaluasi (confusion matrix).

    Args:
        data_dir: Folder dataset. Kalau `None`, pakai `settings.DATASET_DIR`.
        image_size: Ukuran input model, konsisten dengan `settings.IMAGE_SIZE`.
        batch_size: Jumlah citra per batch.

    Returns:
        Tuple (train_dataset, val_dataset, test_dataset) berupa
        DirectoryIterator Keras.
    """
    from tensorflow.keras.preprocessing.image import ImageDataGenerator

    root = Path(data_dir) if data_dir is not None else Path(settings.DATASET_DIR)

    train_generator = ImageDataGenerator(**TRAIN_AUGMENTATION)
    eval_generator = ImageDataGenerator(**EVAL_AUGMENTATION)

    def alirkan(split: str, generator, shuffle: bool):
        return generator.flow_from_directory(
            root / split,
            target_size=(image_size, image_size),
            batch_size=batch_size,
            class_mode="categorical",
            shuffle=shuffle,
        )

    train_dataset = alirkan("train", train_generator, shuffle=True)
    val_dataset = alirkan("val", eval_generator, shuffle=False)
    test_dataset = alirkan("test", eval_generator, shuffle=False)
    return train_dataset, val_dataset, test_dataset


def class_counts(dataset) -> dict[str, int]:
    """Hitung jumlah citra per kelas, berguna untuk mengecek dataset imbalance.

    Bekerja pada DirectoryIterator Keras maupun objek apa pun yang punya
    atribut `class_indices` (dict nama->indeks) dan `classes` (daftar indeks
    kelas per sampel).
    """
    indeks_ke_nama = {indeks: nama for nama, indeks in dataset.class_indices.items()}
    hitung = Counter(dataset.classes)
    return {indeks_ke_nama[indeks]: hitung[indeks] for indeks in sorted(hitung)}
