# Dockerfile backend TomatoAI — target: Hugging Face Spaces (SDK: Docker).
# Space Docker wajib mendengarkan port 7860 (default HF Spaces).
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MODEL_PATH=models/mobilenetv2_tomat.keras \
    CORS_ORIGINS=http://localhost:3000

# libgomp1 dibutuhkan TensorFlow; libglib2.0-0 untuk OpenCV headless.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instal dependensi dulu agar layer cache tidak batal saat kode berubah.
COPY requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY app ./app
COPY models ./models

# HF Spaces menjalankan container sebagai non-root; samakan agar tidak ada
# masalah izin baca model.
RUN useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7860/api/v1/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
