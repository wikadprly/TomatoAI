"""Konfigurasi aplikasi TomatoAI.

Semua nilai bisa diubah lewat environment variable.
Lihat contoh di file `.env.example`.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings:
    APP_NAME: str = "TomatoAI API"
    APP_VERSION: str = "0.1.0"
    API_PREFIX: str = "/api/v1"

    # --- Model MobileNetV2 ---
    # Format .keras: format native Keras 3 (TensorFlow 2.18).
    MODEL_PATH: Path = Path(
        os.getenv("MODEL_PATH") or BASE_DIR / "models" / "mobilenetv2_tomat.keras"
    )
    IMAGE_SIZE: int = int(os.getenv("IMAGE_SIZE", "224"))

    # --- Input model dari hasil pengolahan citra ---
    # original = citra asli 224 (distribusi saat training, default)
    # crop     = potong bbox objek tomat (mask + margin) -> resize 224
    # segment  = citra hasil masking (latar hitam) -> resize 224
    # Nilai tak dikenal dianggap "original". Ubah default setelah menjalankan
    # scripts/evaluate_input_modes.py pada test set.
    INFERENCE_INPUT_MODE: str = (
        os.getenv("INFERENCE_INPUT_MODE", "original").strip().lower()
    )
    CROP_MARGIN_RATIO: float = float(os.getenv("CROP_MARGIN_RATIO", "0.15"))

    # Urutan kelas harus sama dengan urutan output layer model.
    CLASS_NAMES: list[str] = [
        "mentah",
        "setengah_matang",
        "matang",
        "bukan_tomat",
    ]

    # --- Dataset ---
    DATASET_DIR: Path = Path(os.getenv("DATASET_DIR") or BASE_DIR / "datasets")

    # --- Upload gambar dari frontend ---
    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
    ALLOWED_CONTENT_TYPES: list[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]

    # --- CORS, untuk frontend Next.js ---
    # Default mencakup localhost DAN 127.0.0.1 — Next.js kadang pindah port
    # atau user membuka via 127.0.0.1, dan bila origin tidak dicakup request
    # diblokir CORS lalu jatuh ke fallback heuristik tanpa penjelasan.
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
        if origin.strip()
    ]

    # --- Guard "khusus tomat" ---
    # Lapisan pengaman berbasis geometri mask + keyakinan model. Bukan model
    # pembelajaran, jadi apel/jeruk bulat masih bisa lolos. Matikan lewat
    # TOMATO_GUARD_ENABLED=0 bila terlalu ketat untuk dataset tertentu.
    TOMATO_GUARD_ENABLED: bool = os.getenv(
        "TOMATO_GUARD_ENABLED", "1"
    ).strip().lower() not in ("0", "false", "no", "off")

    # Rasio luas objek terhadap seluruh gambar.
    MIN_OBJECT_RATIO: float = float(os.getenv("MIN_OBJECT_RATIO", "0.03"))
    MAX_OBJECT_RATIO: float = float(os.getenv("MAX_OBJECT_RATIO", "0.85"))

    # Bentuk objek: 1.0 = lingkaran sempurna.
    MIN_CIRCULARITY: float = float(os.getenv("MIN_CIRCULARITY", "0.45"))
    MIN_FILL_RATIO: float = float(os.getenv("MIN_FILL_RATIO", "0.60"))
    MIN_SOLIDITY: float = float(os.getenv("MIN_SOLIDITY", "0.80"))
    MIN_ASPECT_RATIO: float = float(os.getenv("MIN_ASPECT_RATIO", "0.55"))
    MAX_ASPECT_RATIO: float = float(os.getenv("MAX_ASPECT_RATIO", "1.80"))

    # Keyakinan model.
    MIN_MODEL_CONFIDENCE: float = float(
        os.getenv("MIN_MODEL_CONFIDENCE", "0.55")
    )
    MIN_CONFIDENCE_MARGIN: float = float(
        os.getenv("MIN_CONFIDENCE_MARGIN", "0.15")
    )


settings = Settings()