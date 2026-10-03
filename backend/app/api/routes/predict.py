"""Route menerima gambar dari frontend dan mengembalikan hasil klasifikasi."""

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.schemas.prediction import PredictionResponse
from app.services.pipeline import ModelNotReadyError, classify_tomato

router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)) -> PredictionResponse:
    """Klasifikasikan tingkat kematangan tomat dari satu gambar.

    Args:
        file: Gambar tomat (jpeg/png/webp) hasil upload pengguna.

    Raises:
        HTTPException: 400 bila file kosong, 413 bila terlalu besar,
            415 bila format tidak didukung, 501 bila modul pemrosesan
            belum diisi, 503 bila model MobileNetV2 belum tersedia.
    """
    if file.content_type not in settings.ALLOWED_CONTENT_TYPES:
        allowed = ", ".join(settings.ALLOWED_CONTENT_TYPES)
        raise HTTPException(
            status_code=415,
            detail=f"Format gambar tidak didukung. Gunakan: {allowed}.",
        )

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File gambar kosong.")

    if len(content) > settings.MAX_UPLOAD_BYTES:
        max_mb = settings.MAX_UPLOAD_BYTES / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Ukuran gambar melebihi batas {max_mb:.0f} MB.",
        )

    try:
        return classify_tomato(content)
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc