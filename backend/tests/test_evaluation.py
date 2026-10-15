"""Test untuk app/services/model/evaluation.py tanpa TensorFlow.

Model dan dataset ditiru supaya metrik bisa diuji tanpa bobot asli.
Membutuhkan scikit-learn; di mesin tanpa itu test di-skip otomatis.
"""

import pytest

pytest.importorskip("sklearn", reason="scikit-learn tidak terpasang")
np = pytest.importorskip("numpy", reason="numpy tidak terpasang")

from app.services.model import evaluation


class ModelTiruan:
    """Model tiruan yang mengembalikan probabilitas yang sudah ditentukan."""

    def __init__(self, probabilitas):
        self._probabilitas = np.asarray(probabilitas, dtype=float)

    def predict(self, dataset, verbose: int = 0):
        return self._probabilitas


class DatasetTiruan:
    """Dataset tiruan dengan atribut minimal yang dipakai evaluation."""

    def __init__(self, classes):
        self.classes = list(classes)
        self.class_indices = {"mentah": 0, "setengah_matang": 1, "matang": 2}

    def reset(self):
        pass


def _one_hot(indeks, n_kelas: int = 3):
    keluaran = np.zeros((len(indeks), n_kelas))
    keluaran[np.arange(len(indeks)), indeks] = 1.0
    return keluaran


def test_evaluate_sempurna():
    classes = [0, 1, 2, 0, 1, 2]

    metrik = evaluation.evaluate(ModelTiruan(_one_hot(classes)), DatasetTiruan(classes))

    assert metrik["accuracy"] == 1.0
    assert metrik["f1"] == 1.0


def test_confusion_matrix_ukuran_dan_total():
    y_true = [0, 1, 2, 0]
    y_pred = [0, 1, 1, 2]

    cm = evaluation.confusion_matrix(
        ModelTiruan(_one_hot(y_pred)), DatasetTiruan(y_true)
    )

    assert len(cm) == 3
    assert all(len(baris) == 3 for baris in cm)
    assert sum(sum(baris) for baris in cm) == len(y_true)


def test_confusion_matrix_menangkap_kesalahan():
    y_true = [0, 0]
    y_pred = [0, 1]

    cm = evaluation.confusion_matrix(
        ModelTiruan(_one_hot(y_pred)), DatasetTiruan(y_true)
    )

    assert cm[0][0] == 1  # benar
    assert cm[0][1] == 1  # salah prediksi ke kelas 1


def test_classification_report_memuat_nama_kelas():
    classes = [0, 1, 2]

    laporan = evaluation.classification_report(
        ModelTiruan(_one_hot(classes)), DatasetTiruan(classes)
    )

    for nama in ("mentah", "setengah_matang", "matang"):
        assert nama in laporan
