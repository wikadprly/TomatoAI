"""Fase 1 (Tim 2): pembersihan dan normalisasi dataset tomat mentah.

Dataset hasil unduhan Kaggle sering berantakan:
- nama folder kelas tidak konsisten (`unripe`, `green`, `Fully Ripened`, ...),
- ada berkas corrupt, duplikat persis, dan berkas non-citra,
- format piksel campuran (RGBA, grayscale, palette).

Script ini menormalkan semuanya menjadi struktur:

    datasets/clean/
    |-- mentah/mentah_001.jpg
    |-- setengah_matang/setengah_matang_001.jpg
    `-- matang/matang_003.jpg

Semua citra keluaran adalah RGB JPEG. Berkas corrupt dipindahkan ke folder
karantina supaya bisa diperiksa manual, bukan dihapus diam-diam.

Pemakaian:
    python -m scripts.clean_dataset [--raw-dir PATH] [--clean-dir PATH]
"""

import argparse
import hashlib
import shutil
from pathlib import Path

from PIL import Image

# Alias nama folder yang umum di dataset Kaggle -> kelas kanonik.
# Kunci dan nama folder dinormalkan dulu (huruf kecil, spasi tunggal).
# Sesuaikan daftar ini bila dataset yang dipakai punya nama folder lain.
DEFAULT_CLASS_ALIASES: dict[str, set[str]] = {
    "mentah": {
        "mentah",
        "unripe",
        "green",
        "green tomato",
        "immature",
        "mature green",
    },
    "setengah_matang": {
        "setengah matang",
        "half ripe",
        "halfripened",
        "half ripened",
        "breaker",
        "turning",
        "pink",
        "light red",
        "semi ripe",
        "partially ripe",
    },
    "matang": {
        "matang",
        "ripe",
        "fully ripe",
        "fully ripened",
        "red",
        "red ripe",
    },
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_RAW_DIR = BASE_DIR / "datasets" / "raw"
DEFAULT_CLEAN_DIR = BASE_DIR / "datasets" / "clean"


def _normalkan_nama(nama: str) -> str:
    """Normalkan nama folder: huruf kecil, underscore/strip jadi spasi."""
    return " ".join(nama.lower().replace("_", " ").replace("-", " ").split())


def _peta_alias(aliases: dict[str, set[str]]) -> dict[str, str]:
    """Balik mapping alias -> kanonik menjadi nama-ternormalkan -> kanonik."""
    return {
        _normalkan_nama(alias): kanonik
        for kanonik, daftar_alias in aliases.items()
        for alias in daftar_alias
    }


def _md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def clean_dataset(
    raw_dir: Path | str,
    clean_dir: Path | str,
    quarantine_dir: Path | str | None = None,
    aliases: dict[str, set[str]] | None = None,
) -> dict[str, int]:
    """Bersihkan dataset mentah menjadi dataset terkurasi per kelas kanonik.

    Args:
        raw_dir: Folder dataset mentah (satu subfolder per label sumber).
        clean_dir: Folder keluaran untuk citra bersih.
        quarantine_dir: Folder untuk berkas corrupt. Default: sejajar raw_dir.
        aliases: Mapping kelas kanonik -> daftar alias nama folder sumber.

    Returns:
        Laporan jumlah: per kelas kanonik plus kunci `corrupt`, `duplicates`,
        `non_image`, dan `skipped_unknown`.

    Raises:
        FileNotFoundError: bila raw_dir tidak ada.
    """
    raw_dir = Path(raw_dir)
    clean_dir = Path(clean_dir)
    if not raw_dir.is_dir():
        raise FileNotFoundError(f"Folder dataset mentah tidak ditemukan: {raw_dir}")
    if quarantine_dir is None:
        quarantine_dir = raw_dir.parent / "quarantine"
    quarantine_dir = Path(quarantine_dir)

    peta_alias = _peta_alias(aliases or DEFAULT_CLASS_ALIASES)

    report: dict[str, int] = {
        kelas: 0 for kelas in (aliases or DEFAULT_CLASS_ALIASES)
    }
    report.update({"corrupt": 0, "duplicates": 0, "non_image": 0, "skipped_unknown": 0})

    seen_hashes: set[str] = set()

    for folder_sumber in sorted(raw_dir.iterdir()):
        if not folder_sumber.is_dir():
            continue
        kelas = peta_alias.get(_normalkan_nama(folder_sumber.name))
        if kelas is None:
            report["skipped_unknown"] += sum(
                1 for f in folder_sumber.iterdir() if f.is_file()
            )
            continue

        tujuan_kelas = clean_dir / kelas
        tujuan_kelas.mkdir(parents=True, exist_ok=True)

        for berkas in sorted(folder_sumber.iterdir()):
            if not berkas.is_file():
                continue
            if berkas.suffix.lower() not in IMAGE_EXTENSIONS:
                report["non_image"] += 1
                continue

            try:
                with Image.open(berkas) as img:
                    img.load()
                    rgb = img.convert("RGB")
            except Exception:
                tujuan_karantina = quarantine_dir / berkas.relative_to(raw_dir)
                tujuan_karantina.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(berkas), tujuan_karantina)
                report["corrupt"] += 1
                continue

            sidik = _md5(berkas)
            if sidik in seen_hashes:
                report["duplicates"] += 1
                continue
            seen_hashes.add(sidik)

            report[kelas] += 1
            nama_baru = tujuan_kelas / f"{kelas}_{report[kelas]:03d}.jpg"
            rgb.save(nama_baru, format="JPEG", quality=95)

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW_DIR)
    parser.add_argument("--clean-dir", type=Path, default=DEFAULT_CLEAN_DIR)
    parser.add_argument("--quarantine-dir", type=Path, default=None)
    args = parser.parse_args()

    report = clean_dataset(args.raw_dir, args.clean_dir, args.quarantine_dir)

    print("Laporan pembersihan dataset:")
    for kunci, nilai in report.items():
        print(f"  {kunci:<16}: {nilai}")


if __name__ == "__main__":
    main()
