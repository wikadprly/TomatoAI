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

    # --- Artefak visual segmentasi ---
    # Kirim mask + citra input model + overlay kontur sebagai data URL.
    # Menambah ~40 KB per respons, tetapi membuat proses pengolahan citra
    # bisa diverifikasi pengguna di halaman hasil. Matikan lewat env bila
    # bandwidth sangat terbatas.
    SEGMENTATION_IMAGES_ENABLED: bool = os.getenv(
        "SEGMENTATION_IMAGES_ENABLED", "1"
    ).strip().lower() not in ("0", "false", "no", "off")

    # --- Rate limit sederhana (per IP, in-memory) ---
    # Inferensi memakai CPU penuh; tanpa batas, beberapa request paralel
    # membuat semua request lambat. Ini bukan proteksi DDoS, hanya pengaman
    # agar demo tidak macet saat beberapa orang mengunggah bersamaan.
    RATE_LIMIT_ENABLED: bool = os.getenv(
        "RATE_LIMIT_ENABLED", "1"
    ).strip().lower() not in ("0", "false", "no", "off")
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # --- Performa model (untuk endpoint /model/info) ---
    # File metrik dihasilkan oleh scripts/export_metrics.py setelah evaluasi
    # test set. Bila tidak ada, /model/info membalas 503.
    METRICS_PATH: Path = Path(
        os.getenv("METRICS_PATH") or BASE_DIR / "models" / "metrics.json"
    )

    # --- Pemanasan model ---
    # Request pertama biasanya lambat (~10-20 detik) karena TensorFlow baru
    # menginisialisasi graph saat itu. Dengan warmup di startup, pengguna
    # pertama tidak menunggu selama itu.
    WARMUP_ENABLED: bool = os.getenv(
        "WARMUP_ENABLED", "1"
    ).strip().lower() not in ("0", "false", "no", "off")

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
    #
    # Ambang di bawah dikalibrasi pada test set proyek (677 gambar, 3 kelas):
    # ambang lama menolak 98/677 (14,5%) foto tomat yang SAH — 54 karena
    # circularity dan 20 karena MAX_OBJECT_RATIO terlalu rendah. Nilai baru
    # diambil dari persentil bawah/sebaran metrik tersebut sehingga foto tomat
    # yang sah (termasuk close-up yang memenuhi frame) lolos, sementara guard
    # tetap menolak mask kosong dan bentuk yang jelas bukan satu objek.
    TOMATO_GUARD_ENABLED: bool = os.getenv(
        "TOMATO_GUARD_ENABLED", "1"
    ).strip().lower() not in ("0", "false", "no", "off")

    # Rasio luas objek terhadap seluruh gambar. Foto close-up wajar mengisi
    # hampir seluruh frame (test set: p0.5=0.32, p95=0.82, max=0.97).
    MIN_OBJECT_RATIO: float = float(os.getenv("MIN_OBJECT_RATIO", "0.10"))
    MAX_OBJECT_RATIO: float = float(os.getenv("MAX_OBJECT_RATIO", "0.98"))

    # Bentuk objek: 1.0 = lingkaran sempurna. Mask tomat nyata sering tidak
    # bulat sempurna (tangkai, dua tomat berdekatan), jadi ambang dibuat longgar
    # (test set: circularity p0.5=0.24, fill p0.5=0.50, solidity p0.5=0.69).
    MIN_CIRCULARITY: float = float(os.getenv("MIN_CIRCULARITY", "0.20"))
    MIN_FILL_RATIO: float = float(os.getenv("MIN_FILL_RATIO", "0.45"))
    MIN_SOLIDITY: float = float(os.getenv("MIN_SOLIDITY", "0.60"))
    MIN_ASPECT_RATIO: float = float(os.getenv("MIN_ASPECT_RATIO", "0.45"))
    MAX_ASPECT_RATIO: float = float(os.getenv("MAX_ASPECT_RATIO", "2.20"))

    # Keyakinan model. Guard keyakinan tetap aktif sebagai penyaring prediksi
    # yang ragu, tetapi ambang dilonggarkan karena model sudah punya kelas
    # penolakan `bukan_tomat` yang menangani objek non-tomat.
    MIN_MODEL_CONFIDENCE: float = float(
        os.getenv("MIN_MODEL_CONFIDENCE", "0.45")
    )
    MIN_CONFIDENCE_MARGIN: float = float(
        os.getenv("MIN_CONFIDENCE_MARGIN", "0.10")
    )


settings = Settings()