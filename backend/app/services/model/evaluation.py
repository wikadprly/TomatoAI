"""Evaluasi model.

Evaluasi selalu dilakukan pada data uji (test set) yang tidak pernah dipakai
saat training, supaya angka accuracy tidak terlalu optimis.

Urutan sampel pada test set harus sejajar dengan labelnya, karena itu
`dataset.build_datasets` memakai `shuffle=False` untuk val/test.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from app.core.config import settings


def _collect_predictions(model, test_dataset) -> tuple[np.ndarray, np.ndarray]:
    """Jalankan model pada seluruh test set dan kembalikan (y_true, y_pred).

    Args:
        model: Model Keras yang sudah dilatih.
        test_dataset: Dataset uji dari `dataset.build_datasets`.

    Returns:
        Tuple (label_sebenarnya, label_prediksi) berisi indeks kelas.
    """
    # DirectoryIterator perlu di-reset agar bisa dipakai lebih dari sekali
    # (evaluate, confusion matrix, dan report memanggilnya terpisah).
    reset = getattr(test_dataset, "reset", None)
    if callable(reset):
        reset()

    probabilitas = model.predict(test_dataset, verbose=0)
    y_pred = np.argmax(probabilitas, axis=1)
    y_true = np.asarray(test_dataset.classes)
    return y_true, y_pred


def _target_names(test_dataset) -> list[str]:
    """Nama kelas sesuai urutan indeks pada dataset.

    Diambil dari `dataset.class_indices` (folder yang benar-benar dibaca),
    dengan fallback ke `settings.CLASS_NAMES` bila atribut itu tidak ada.
    """
    class_indices = getattr(test_dataset, "class_indices", None)
    if class_indices:
        return [nama for nama, _ in sorted(class_indices.items(), key=lambda item: item[1])]
    return list(settings.CLASS_NAMES)


def evaluate(model, test_dataset) -> dict[str, float]:
    """Hitung metrik evaluasi pada data uji.

    Args:
        model: Model MobileNetV2 yang sudah dilatih.
        test_dataset: Dataset uji dari `dataset.build_datasets`.

    Returns:
        Dictionary metrik, misalnya accuracy, precision, recall, f1.
    """
    from sklearn.metrics import (
        accuracy_score,
        f1_score,
        precision_score,
        recall_score,
    )

    y_true, y_pred = _collect_predictions(model, test_dataset)

    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(
            precision_score(y_true, y_pred, average="macro", zero_division=0)
        ),
        "recall": float(
            recall_score(y_true, y_pred, average="macro", zero_division=0)
        ),
        "f1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
    }


def confusion_matrix(model, test_dataset) -> list[list[int]]:
    """Hitung confusion matrix 3x3 sesuai urutan `settings.CLASS_NAMES`.

    Args:
        model: Model yang sudah dilatih.
        test_dataset: Dataset uji.

    Returns:
        Matrix berukuran 3x3; baris = label sebenarnya, kolom = prediksi.
    """
    from sklearn.metrics import confusion_matrix as sk_confusion_matrix

    y_true, y_pred = _collect_predictions(model, test_dataset)
    labels = list(range(len(settings.CLASS_NAMES)))
    matrix = sk_confusion_matrix(y_true, y_pred, labels=labels)
    return matrix.astype(int).tolist()


def classification_report(model, test_dataset) -> str:
    """Buat laporan klasifikasi per kelas, siap dimasukkan ke laporan proyek."""
    from sklearn.metrics import classification_report as sk_classification_report

    y_true, y_pred = _collect_predictions(model, test_dataset)
    return sk_classification_report(
        y_true,
        y_pred,
        target_names=_target_names(test_dataset),
        digits=4,
        zero_division=0,
    )


def export_metrics(model, test_dataset, path: Path | str | None = None) -> str:
    """Hitung metrik penuh pada test set lalu tulis ke ``metrics.json``.

    File ini adalah "hasil training dalam bentuk JSON": metrik + confusion
    matrix + laporan per kelas, lengkap dengan metadata model. Dipakai untuk
    dokumentasi laporan/README dan untuk memverifikasi model yang dideploy
    tanpa membuka notebook training.

    Args:
        model: Model MobileNetV2 yang sudah dilatih.
        test_dataset: Dataset uji dari ``dataset.build_datasets``.
        path: Lokasi keluaran. Default: ``<folder model>/metrics.json``.

    Returns:
        Path file metrics.json yang tersimpan.
    """
    if path is None:
        path = Path(settings.MODEL_PATH).parent / "metrics.json"
    path = Path(path)

    payload = {
        "model": str(settings.MODEL_PATH),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "image_size": settings.IMAGE_SIZE,
        "class_names": list(settings.CLASS_NAMES),
        "test_set_size": int(len(getattr(test_dataset, "classes", []))),
        "metrics": evaluate(model, test_dataset),
        "confusion_matrix": confusion_matrix(model, test_dataset),
        "confusion_matrix_labels": {
            "rows": "label_sebenarnya",
            "columns": "prediksi",
            "order": list(settings.CLASS_NAMES),
        },
        "classification_report": classification_report(model, test_dataset),
    }

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Metrik disimpan ke: {path}")
    return str(path)
