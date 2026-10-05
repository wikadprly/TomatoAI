"""Pembagian dataset bersih menjadi train/val/test.

Pembagian dilakukan stratified per kelas supaya proporsi kelas seimbang di
ketiga split. Rasio bawaan 70:15:15 sesuai keputusan tim (lihat
backend/datasets/README.md) dan dapat diubah lewat argumen.

Aturan pembulatan: train = floor(ratio_train * n), val = floor(ratio_val * n),
test = sisanya. Dengan seed tetap, hasil pembagian reproducible.

Pemakaian:
    python -m scripts.split_dataset [--clean-dir PATH] [--output-dir PATH]
"""

import argparse
import random
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CLEAN_DIR = BASE_DIR / "datasets" / "clean"
DEFAULT_OUTPUT_DIR = BASE_DIR / "datasets"

SPLIT_NAMES = ("train", "val", "test")
DEFAULT_RATIOS = (0.70, 0.15, 0.15)


def split_dataset(
    clean_dir: Path | str,
    output_dir: Path | str,
    ratios: tuple[float, float, float] = DEFAULT_RATIOS,
    seed: int = 42,
) -> dict[str, dict[str, int]]:
    """Bagi dataset bersih ke train/val/test secara stratified per kelas.

    Args:
        clean_dir: Folder dataset bersih (satu subfolder per kelas).
        output_dir: Folder keluaran; dibuat subfolder train/val/test di dalamnya.
        ratios: Proporsi (train, val, test), harus berjumlah 1.0.
        seed: Seed acak agar pembagian reproducible.

    Returns:
        Laporan {nama_split: {kelas: jumlah_berkas}}.

    Raises:
        FileNotFoundError: bila clean_dir tidak ada.
        ValueError: bila ratios tidak berjumlah 1.0.
    """
    clean_dir = Path(clean_dir)
    output_dir = Path(output_dir)
    if not clean_dir.is_dir():
        raise FileNotFoundError(f"Folder dataset bersih tidak ditemukan: {clean_dir}")
    if len(ratios) != len(SPLIT_NAMES) or abs(sum(ratios) - 1.0) > 1e-9:
        raise ValueError(f"Rasio harus {len(SPLIT_NAMES)} angka berjumlah 1.0: {ratios}")

    rng = random.Random(seed)
    report: dict[str, dict[str, int]] = {split: {} for split in SPLIT_NAMES}

    for folder_kelas in sorted(clean_dir.iterdir()):
        if not folder_kelas.is_dir():
            continue
        kelas = folder_kelas.name
        berkas = sorted(p for p in folder_kelas.iterdir() if p.is_file())
        rng.shuffle(berkas)

        n = len(berkas)
        n_train = int(ratios[0] * n)
        n_val = int(ratios[1] * n)

        pembagian = {
            "train": berkas[:n_train],
            "val": berkas[n_train : n_train + n_val],
            "test": berkas[n_train + n_val :],
        }

        for split, daftar in pembagian.items():
            tujuan = output_dir / split / kelas
            tujuan.mkdir(parents=True, exist_ok=True)
            for berkas_sumber in daftar:
                shutil.copy2(berkas_sumber, tujuan / berkas_sumber.name)
            report[split][kelas] = len(daftar)

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--clean-dir", type=Path, default=DEFAULT_CLEAN_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--ratios",
        type=float,
        nargs=3,
        default=list(DEFAULT_RATIOS),
        metavar=("TRAIN", "VAL", "TEST"),
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    report = split_dataset(args.clean_dir, args.output_dir, tuple(args.ratios), args.seed)

    print("Laporan pembagian dataset:")
    for split, per_kelas in report.items():
        total = sum(per_kelas.values())
        rincian = ", ".join(f"{k}: {v}" for k, v in sorted(per_kelas.items()))
        print(f"  {split:<5} ({total} berkas) -> {rincian}")


if __name__ == "__main__":
    main()
