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

    # --- Model MobileNetV2 (Tim 2) ---
    # Format .keras: format native Keras 3 (TensorFlow 2.18).
    MODEL_PATH: Path = Path(
        os.getenv("MODEL_PATH") or BASE_DIR / "models" / "mobilenetv2_tomat.keras"
    )
    IMAGE_SIZE: int = int(os.getenv("IMAGE_SIZE", "224"))

    # Urutan kelas harus sama dengan urutan output layer model.
    CLASS_NAMES: list[str] = [
        "mentah",
        "setengah_matang",
        "matang",
    ]

    # --- Dataset (Tim 2) ---
    DATASET_DIR: Path = Path(os.getenv("DATASET_DIR") or BASE_DIR / "datasets")

    # --- Upload gambar dari frontend ---
    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
    ALLOWED_CONTENT_TYPES: list[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]

    # --- CORS, untuk frontend Next.js ---
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]


settings = Settings()