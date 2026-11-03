"""Bandingkan mode input model pada test set (tanpa training ulang).

Model yang dievaluasi tetap bobot yang sudah ada. Yang diubah hanya cara
menyiapkan input dari hasil pengolahan citra:

- ``original``: citra 224 apa adanya (distribusi saat training),
- ``crop``: potong bbox objek tomat (mask + margin) dari resolusi penuh,
- ``segment``: citra hasil masking (latar belakang hitam).

Jalankan dari folder ``backend/`` setelah dataset test tersedia:

    python -m scripts.evaluate_input_modes
    python -m scripts.evaluate_input_modes --modes original crop --limit 100
    python -m scripts.evaluate_input_modes --out models/input_mode_comparison.json

Dataset tidak perlu diunduh ulang dari Kaggle kalau folder
``datasets/test/<kelas>/`` masih ada. Struktur kelas mengikuti
``settings.CLASS_NAMES``.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402

MODES = ("original", "crop", "segment")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _collect_files(split_dir: Path, limit: int | None) -> list[tuple[Path, int]]:
    """Kumpulkan (path, indeks_kelas) sesuai urutan ``settings.CLASS_NAMES``.

    ``limit`` membatasi jumlah citra **per kelas** supaya evaluasi cepat tetap
    seimbang (bukan hanya mengambil kelas pertama).
    """
    berkas: list[tuple[Path, int]] = []
    for indeks, nama_kelas in enumerate(settings.CLASS_NAMES):
        kelas_dir = split_dir / nama_kelas
        if not kelas_dir.is_dir():
            raise FileNotFoundError(
                f"Folder kelas tidak ditemukan: {kelas_dir}. "
                "Pastikan dataset test mengikuti struktur test/<kelas>/."
            )
        jumlah_kelas = 0
        for path in sorted(
            p for p in kelas_dir.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS
        ):
            berkas.append((path, indeks))
            jumlah_kelas += 1
            if limit is not None and jumlah_kelas >= limit:
                break
    return berkas


def _predict_mode(
    berkas: list[tuple[Path, int]],
    mode: str,
    model,
    image_size: int,
    batch_size: int,
    margin_ratio: float,
) -> tuple[list[int], list[int], int]:
    """Prediksi seluruh test set untuk satu mode input.

    Returns:
        Tuple ``(y_true, y_pred, jumlah_gagal_baca)``.
    """
    import numpy as np

    from app.services.image_processing.preprocessing import load_image_raw
    from app.services.image_processing.roi import prepare_model_input
    from app.services.image_processing.segmentation import segment_tomato_with_mask

    y_true: list[int] = []
    y_pred: list[int] = []
    gagal = 0

    batch_input: list[np.ndarray] = []
    batch_label: list[int] = []

    def _flush() -> None:
        if not batch_input:
            return
        probabilitas = model.predict(np.stack(batch_input), verbose=0)
        y_pred.extend(int(i) for i in np.argmax(probabilitas, axis=1))
        y_true.extend(batch_label)
        batch_input.clear()
        batch_label.clear()

    for path, label in berkas:
        try:
            raw = load_image_raw(path.read_bytes())
        except Exception as exc:  # noqa: BLE001 - laporkan lalu lanjut
            gagal += 1
            print(f"  lewati {path.name}: {exc}", file=sys.stderr)
            continue

        resized = raw.resize((image_size, image_size))
        segmented, mask, _ = segment_tomato_with_mask(resized)
        model_input = prepare_model_input(
            raw,
            resized,
            segmented,
            mask,
            mode=mode,
            margin_ratio=margin_ratio,
        )
        array = np.asarray(
            model_input.resize((image_size, image_size)), dtype=np.float32
        ) / 255.0
        batch_input.append(array)
        batch_label.append(label)

        if len(batch_input) >= batch_size:
            _flush()

    _flush()
    return y_true, y_pred, gagal


def _metrics(y_true: list[int], y_pred: list[int]) -> dict:
    """Hitung accuracy, macro-F1, metrik per kelas, dan confusion matrix."""
    from sklearn.metrics import (
        accuracy_score,
        confusion_matrix,
        f1_score,
        precision_recall_fscore_support,
    )

    labels = list(range(len(settings.CLASS_NAMES)))
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    per_kelas = {
        nama: {
            "precision": float(precision[i]),
            "recall": float(recall[i]),
            "f1": float(f1[i]),
            "support": int(support[i]),
        }
        for i, nama in enumerate(settings.CLASS_NAMES)
    }
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "per_class": per_kelas,
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        "confusion_matrix_labels": settings.CLASS_NAMES,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bandingkan input original/crop/segment pada test set"
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=settings.DATASET_DIR,
        help="Folder dataset (default: settings.DATASET_DIR)",
    )
    parser.add_argument("--split", default="test", help="Nama split (default: test)")
    parser.add_argument(
        "--modes",
        nargs="+",
        default=list(MODES),
        choices=MODES,
        help="Mode input yang dibandingkan (default: semua)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Batasi jumlah citra per kelas (untuk uji cepat)",
    )
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Path JSON hasil perbandingan (opsional)",
    )
    args = parser.parse_args()

    if not Path(settings.MODEL_PATH).is_file():
        print(f"Model tidak ditemukan: {settings.MODEL_PATH}", file=sys.stderr)
        return 1

    split_dir = Path(args.data_dir) / args.split
    if not split_dir.is_dir():
        print(
            f"Folder split tidak ditemukan: {split_dir}\n"
            "Taruh test set di datasets/test/<kelas>/ (tanpa perlu Kaggle), "
            "atau unduh ulang dataset dari sumbernya.",
            file=sys.stderr,
        )
        return 1

    try:
        import tensorflow  # noqa: F401
    except ImportError:
        print(
            "TensorFlow tidak terpasang. Jalankan: pip install -r requirements-ml.txt",
            file=sys.stderr,
        )
        return 1

    from app.services.model.predictor import load_model

    berkas = _collect_files(split_dir, args.limit)
    if not berkas:
        print(f"Tidak ada citra di {split_dir}", file=sys.stderr)
        return 1

    print(f"Model   : {settings.MODEL_PATH}")
    print(f"Data uji: {split_dir} ({len(berkas)} citra)")
    print(f"Mode    : {', '.join(args.modes)}\n")

    model = load_model()
    hasil: dict[str, dict] = {}
    for mode in args.modes:
        print(f"Menjalankan mode '{mode}'...")
        y_true, y_pred, gagal = _predict_mode(
            berkas,
            mode,
            model,
            settings.IMAGE_SIZE,
            args.batch_size,
            settings.CROP_MARGIN_RATIO,
        )
        metrik = _metrics(y_true, y_pred)
        metrik["evaluated"] = len(y_true)
        metrik["skipped"] = gagal
        hasil[mode] = metrik

    print(f"\n{'Mode':<10}{'N':>6}{'Accuracy':>12}{'Macro-F1':>12}")
    print("-" * 40)
    for mode in args.modes:
        metrik = hasil[mode]
        print(
            f"{mode:<10}{metrik['evaluated']:>6}"
            f"{metrik['accuracy']:>12.4f}{metrik['f1_macro']:>12.4f}"
        )

    if args.out:
        payload = {
            "model": str(settings.MODEL_PATH),
            "split_dir": str(split_dir),
            "image_size": settings.IMAGE_SIZE,
            "crop_margin_ratio": settings.CROP_MARGIN_RATIO,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "results": hasil,
        }
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"\nHasil disimpan ke: {args.out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
