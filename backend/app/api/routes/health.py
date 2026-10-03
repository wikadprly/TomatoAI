"""Route untuk mengecek apakah backend hidup."""

from fastapi import APIRouter

from app.core.config import settings
from app.schemas.prediction import HealthResponse
from app.services.model.predictor import model_is_ready

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Cek status backend dan apakah model sudah siap dipakai."""
    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        model_loaded=model_is_ready(),
    )