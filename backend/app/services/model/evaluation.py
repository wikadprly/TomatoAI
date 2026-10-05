"""Evaluasi model.

Evaluasi selalu dilakukan pada data uji (test set) yang tidak pernah dipakai
saat training, supaya angka accuracy tidak terlalu optimis.
"""

TODO = "Isi model/evaluation.py"


def evaluate(model, test_dataset) -> dict[str, float]:
    """Hitung metrik evaluasi pada data uji.

    Args:
        model: Model MobileNetV2 yang sudah dilatih.
        test_dataset: Dataset uji dari `dataset.build_datasets`.

    Returns:
        Dictionary metrik, misalnya accuracy, precision, recall, f1.
    """
    raise NotImplementedError(TODO)


def confusion_matrix(model, test_dataset) -> list[list[int]]:
    """Hitung confusion matrix 3x3 sesuai urutan `settings.CLASS_NAMES`.

    Args:
        model: Model yang sudah dilatih.
        test_dataset: Dataset uji.

    Returns:
        Matrix berukuran 3x3; baris = label sebenarnya, kolom = prediksi.
    """
    raise NotImplementedError(TODO)


def classification_report(model, test_dataset) -> str:
    """Buat laporan klasifikasi per kelas, siap dimasukkan ke laporan proyek."""
    raise NotImplementedError(TODO)