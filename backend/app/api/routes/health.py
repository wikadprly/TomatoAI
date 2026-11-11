"""Route untuk mengecek apakah backend hidup."""

from fastapi import APIRouter

from app.core.config import settings
from app.core.runtime import uptime_seconds
from app.schemas.prediction import HealthResponse
from app.services.model.predictor import model_is_ready, tensorflow_available

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Cek status backend dan apakah model siap dipakai.

    ``model_loaded`` hanya ``True`` bila bobot ada di disk DAN TensorFlow
    bisa diimpor — kalau sekadar file ada tetapi TF tidak terpasang,
    ``/predict`` pasti gagal dan health tidak boleh menyiarkan siap.

    ``uptime_seconds`` membantu memantau apakah proses sempat restart saat
    pengujian, tanpa perlu membaca log.
    """
    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        model_loaded=model_is_ready() and tensorflow_available(),
        uptime_seconds=uptime_seconds(),
        input_mode=settings.INFERENCE_INPUT_MODE,
    )
