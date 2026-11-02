"""Ekspor metrics.json dari model + test set tanpa training ulang.

Metrik dihitung ulang langsung dari bobot `.keras` yang ada di disk, lalu
ditulis ke `models/metrics.json` (ikut ter-commit, lihat .gitignore).

Pemakaian (dari folder backend, dengan dataset tersedia):

    python -m scripts.export_metrics [--model PATH] [--out PATH]

Bila dataset uji tidak ada di mesin ini (mis. deploy server), file
metrics.json lama tetap dipakai — script ini hanya untuk regenerasi.
"""

import argparse
import sys
from pathlib import Path

# Pastikan package `app` bisa diimpor saat script dijalankan langsung.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402


def main() -> int:
    """Jalankan evaluasi dan tulis metrics.json."""
    parser = argparse.ArgumentParser(description="Ekspor metrik model ke metrics.json")
    parser.add_argument(
        "--model",
        type=Path,
        default=settings.MODEL_PATH,
        help="Path file bobot .keras (default: dari settings)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Path keluaran metrics.json (default: <folder model>/metrics.json)",
    )
    args = parser.parse_args()

    if not Path(args.model).exists():
        print(f"Model tidak ditemukan: {args.model}", file=sys.stderr)
        return 1

    try:
        import tensorflow  # noqa: F401
    except ImportError:
        print(
            "TensorFlow tidak terpasang. Jalankan: pip install -r requirements-ml.txt",
            file=sys.stderr,
        )
        return 1

    from app.services.model.dataset import build_datasets
    from app.services.model.evaluation import export_metrics
    from tensorflow.keras.models import load_model

    print(f"Memuat model: {args.model}")
    model = load_model(str(args.model))

    print("Membangun dataset uji...")
    _, _, test_ds = build_datasets(image_size=settings.IMAGE_SIZE)

    export_metrics(model, test_ds, path=args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
