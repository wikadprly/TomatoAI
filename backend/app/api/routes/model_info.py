"""Route untuk mempublikasikan metrik evaluasi model."""

from fastapi import APIRouter, HTTPException

from app.schemas.prediction import ModelInfoResponse
from app.services.model.metrics import ModelMetricsUnavailable, load_model_info

router = APIRouter(tags=["model"])


@router.get("/model/info", response_model=ModelInfoResponse)
def model_info() -> ModelInfoResponse:
    """Ringkasan performa model pada test set (akurasi, F1, confusion matrix).

    Dipakai halaman "Performa Model" di frontend. Tidak menyentuh TensorFlow,
    jadi tetap bisa diakses saat model sedang dimuat.

    Raises:
        HTTPException: 503 bila file metrik belum dihasilkan.
    """
    try:
        return load_model_info()
    except ModelMetricsUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
