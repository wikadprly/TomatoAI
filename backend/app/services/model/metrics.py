"""Baca dan sajikan metrik evaluasi model dari ``models/metrics.json``.

File itu dihasilkan oleh ``scripts/export_metrics.py`` setelah evaluasi pada
test set. Endpoint ``/model/info`` memakainya untuk halaman publik "Performa
Model" — angka akurasi, precision/recall/F1 per kelas, dan confusion matrix
yang bisa ditampilkan apa adanya tanpa perlu hardcode di frontend.

Catatan keamanan: ``metrics.json`` menyimpan path absolut mesin yang
menghasilkan metrik (mis. ``/home/user/...``). Field itu tidak pernah
diteruskan; yang dikirim hanya nama file bobot.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.core.config import settings
from app.schemas.prediction import ClassMetric, ModelInfoResponse

__all__ = ["ModelMetricsUnavailable", "load_model_info"]


class ModelMetricsUnavailable(RuntimeError):
    """File metrik belum ada atau isinya tidak valid."""


def _safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def _per_class_metrics(
    class_names: list[str], matrix: list[list[int]]
) -> list[ClassMetric]:
    """Turunkan precision/recall/F1 per kelas dari confusion matrix.

    Baris = kelas sebenarnya, kolom = kelas prediksi — konvensi yang sama
    dipakai ``sklearn.metrics.confusion_matrix`` di ``export_metrics.py``.
    """
    n = min(len(class_names), len(matrix))
    metrics: list[ClassMetric] = []

    for i in range(n):
        true_positive = float(matrix[i][i]) if i < len(matrix[i]) else 0.0
        predicted_total = sum(
            float(matrix[row][i]) for row in range(n) if i < len(matrix[row])
        )
        actual_total = float(sum(matrix[i][:n]))

        precision = _safe_div(true_positive, predicted_total)
        recall = _safe_div(true_positive, actual_total)
        f1 = _safe_div(2 * precision * recall, precision + recall)

        metrics.append(
            ClassMetric(
                label=class_names[i],
                precision=round(precision, 4),
                recall=round(recall, 4),
                f1=round(f1, 4),
                support=int(actual_total),
            )
        )

    return metrics


@lru_cache(maxsize=1)
def _read_metrics_file(path: str, mtime: float) -> dict:
    """Cache isi file; ``mtime`` ikut jadi kunci agar hasil re-export terbaca."""
    try:
        with Path(path).open(encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise ModelMetricsUnavailable(
            "Metrik evaluasi model belum tersedia. Jalankan "
            "`python -m scripts.export_metrics` setelah evaluasi test set."
        ) from exc

    if not isinstance(data, dict):
        raise ModelMetricsUnavailable("Format file metrik tidak dikenali.")
    return data


def load_model_info() -> ModelInfoResponse:
    """Susun ringkasan performa model untuk dikirim ke frontend.

    Raises:
        ModelMetricsUnavailable: bila ``models/metrics.json`` tidak ada/rusak.
    """
    path = Path(settings.METRICS_PATH)
    if not path.is_file():
        raise ModelMetricsUnavailable(
            "Metrik evaluasi model belum tersedia. Jalankan "
            "`python -m scripts.export_metrics` setelah evaluasi test set."
        )

    data = _read_metrics_file(str(path), path.stat().st_mtime)

    metrics = data.get("metrics") or {}
    class_names = [str(name) for name in data.get("class_names") or settings.CLASS_NAMES]
    matrix = data.get("confusion_matrix") or []

    # Bersihkan path absolut: kirim nama file saja.
    model_path = str(data.get("model") or settings.MODEL_PATH)

    return ModelInfoResponse(
        model_name=Path(model_path).name or "mobilenetv2_tomat.keras",
        generated_at=data.get("generated_at"),
        image_size=int(data.get("image_size") or settings.IMAGE_SIZE),
        class_names=class_names,
        test_set_size=int(data.get("test_set_size") or 0),
        accuracy=float(metrics.get("accuracy") or 0.0),
        precision=float(metrics.get("precision") or 0.0),
        recall=float(metrics.get("recall") or 0.0),
        f1=float(metrics.get("f1") or 0.0),
        confusion_matrix=[[int(value) for value in row] for row in matrix],
        per_class=_per_class_metrics(class_names, matrix),
        input_mode=settings.INFERENCE_INPUT_MODE,
        guard_enabled=settings.TOMATO_GUARD_ENABLED,
    )
