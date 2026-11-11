"""Entry point aplikasi FastAPI TomatoAI.

Jalankan development server:
    uvicorn app.main:app --reload
Dokumentasi otomatis:
    http://localhost:8000/docs
"""

import logging
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import health, model_info, predict
from app.core.config import settings
from app.core.rate_limit import RateLimiterMiddleware

logger = logging.getLogger("tomatoai")

# Batas waktu request yang dicatat sebagai "lambat" (detik).
SLOW_REQUEST_SECONDS = 1.0


def _warmup_model() -> None:
    """Muat model + inisialisasi TensorFlow di latar belakang.

    Request pertama ke ``/predict`` tanpa warmup bisa memakan 10-20 detik
    karena TF baru membangun graph dan membaca bobot. Fungsi ini hanya
    best-effort: kegagalan di sini tidak boleh menggagalkan startup, karena
    ``/health`` tetap melaporkan ``model_loaded`` dengan jujur.
    """
    try:
        import numpy as np

        from app.services.model.predictor import load_model, tensorflow_available

        if not tensorflow_available():
            logger.info("Warmup dilewati: TensorFlow tidak tersedia.")
            return

        started = time.perf_counter()
        model = load_model()
        # Satu inferensi dummy agar graph dan alokasi memori ikut siap.
        model.predict(np.zeros((1, settings.IMAGE_SIZE, settings.IMAGE_SIZE, 3)), verbose=0)
        logger.info("Warmup model selesai dalam %.1f detik.", time.perf_counter() - started)
    except Exception as exc:  # pragma: no cover - bergantung environment
        logger.warning("Warmup model gagal (bukan fatal): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Jalankan warmup model tanpa memblokir startup."""
    if settings.WARMUP_ENABLED:
        threading.Thread(target=_warmup_model, name="model-warmup", daemon=True).start()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "REST API untuk klasifikasi tingkat kematangan tomat menggunakan "
        "pengolahan citra dan MobileNetV2."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=[
        "X-Response-Time-Ms",
        "X-RateLimit-Remaining",
        "Retry-After",
    ],
)
app.add_middleware(RateLimiterMiddleware)


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Catat durasi request dan kirim sebagai header.

    Dipakai untuk membuktikan klaim performa di laporan tanpa perlu
    memasang APM: ``curl -sI`` sudah menunjukkan waktu proses server.
    """
    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Response-Time-Ms"] = f"{duration_ms:.0f}"

    if duration_ms >= SLOW_REQUEST_SECONDS * 1000:
        logger.info(
            "%s %s -> %s dalam %.0f ms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Balas JSON yang konsisten, bukan halaman debug HTML.

    Detail internal tidak diteruskan ke klien; hanya dicatat di log server.
    """
    logger.exception("Unhandled error pada %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": (
                "Terjadi kesalahan internal pada server. Coba lagi beberapa saat."
            )
        },
    )


app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(predict.router, prefix=settings.API_PREFIX)
app.include_router(model_info.router, prefix=settings.API_PREFIX)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    """Informasi singkat endpoint root."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
