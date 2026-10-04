"""Fase 1 (Tim 2): unduh dataset tomat dari Kaggle ke datasets/raw/.

Prasyarat (sekali saja):
1. Buat akun Kaggle, lalu buka https://www.kaggle.com/settings -> API ->
   "Create New Token". Berkas `kaggle.json` akan terunduh.
2. Simpan berkas itu ke `~/.kaggle/kaggle.json`.
3. Pasang kaggle CLI: `pip install kaggle`.

Mencari kandidat dataset:
    kaggle datasets list -s "tomato ripeness"

Pemakaian:
    python -m scripts.download_dataset <username/slug-dataset>
    python -m scripts.download_dataset andrewmvd/tomato-detection

Tanpa akses Kaggle, unduh ZIP manual lewat browser lalu ekstrak sendiri ke
`backend/datasets/raw/`.
"""

import argparse
import os
import shutil
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_RAW_DIR = BASE_DIR / "datasets" / "raw"


def periksa_prasyarat(env=None, which=shutil.which) -> list[str]:
    """Periksa kaggle CLI dan token kaggle.json, kembalikan daftar masalah.

    Daftar kosong berarti siap mengunduh. Setiap masalah berisi instruksi
    perbaikannya supaya pengguna tidak perlu menebak-nebak.
    """
    env = os.environ if env is None else env
    masalah: list[str] = []

    if which("kaggle") is None:
        masalah.append(
            "kaggle CLI belum terpasang. Jalankan: pip install kaggle"
        )

    config_dir = Path(env.get("KAGGLE_CONFIG_DIR") or Path.home() / ".kaggle")
    if not (config_dir / "kaggle.json").is_file():
        masalah.append(
            f"Token kaggle.json tidak ditemukan di {config_dir}. "
            "Unduh dari https://www.kaggle.com/settings (bagian API) lalu "
            f"simpan sebagai {config_dir / 'kaggle.json'}."
        )

    return masalah


def download_dataset(slug: str, output_dir: Path | str = DEFAULT_RAW_DIR) -> Path:
    """Unduh dan ekstrak dataset Kaggle ke output_dir.

    Args:
        slug: Nama dataset di Kaggle, format `<username>/<slug-dataset>`.
        output_dir: Folder tujuan ekstraksi (default `datasets/raw/`).

    Returns:
        Path folder hasil ekstraksi.

    Raises:
        RuntimeError: bila prasyarat (CLI/token) belum terpenuhi.
    """
    masalah = periksa_prasyarat()
    if masalah:
        raise RuntimeError(
            "Prasyarat Kaggle belum lengkap:\n- " + "\n- ".join(masalah)
        )

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["kaggle", "datasets", "download", "-d", slug, "-p", str(output_dir), "--unzip"],
        check=True,
    )
    return output_dir


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("slug", help="Slug dataset Kaggle: <username>/<slug-dataset>")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_RAW_DIR)
    args = parser.parse_args()

    hasil = download_dataset(args.slug, args.output_dir)
    print(f"Dataset terekstrak di: {hasil}")


if __name__ == "__main__":
    main()
