"""Pembatas laju request sederhana untuk endpoint inferensi.

Bukan pengganti reverse-proxy/DDoS protection: state disimpan di memori
proses, jadi tidak berlaku lintas worker. Tujuannya hanya menjaga agar demo
tidak macet ketika beberapa orang mengunggah foto bersamaan — inferensi
MobileNetV2 memakai CPU penuh dan endpoint-nya sinkron.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings

__all__ = ["RateLimiterMiddleware"]

WINDOW_SECONDS = 60.0


class _SlidingWindow:
    """Hitungan request per kunci dalam jendela waktu bergulir."""

    def __init__(self, limit: int, window: float = WINDOW_SECONDS) -> None:
        self.limit = limit
        self.window = window
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str) -> tuple[bool, int]:
        """Catat satu request. Kembalikan ``(diizinkan, sisa_kuota)``."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            cutoff = now - self.window
            while hits and hits[0] <= cutoff:
                hits.popleft()

            if len(hits) >= self.limit:
                return False, 0

            hits.append(now)
            return True, max(0, self.limit - len(hits))


class RateLimiterMiddleware:
    """ASGI middleware: batasi ``/predict`` per alamat IP."""

    def __init__(self, app) -> None:
        self.app = app
        self._limiter = _SlidingWindow(settings.RATE_LIMIT_PER_MINUTE)
        self._path_suffix = "/predict"

    async def __call__(self, scope, receive, send) -> None:
        if (
            not settings.RATE_LIMIT_ENABLED
            or scope["type"] != "http"
            or not scope.get("path", "").endswith(self._path_suffix)
        ):
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        client = request.client.host if request.client else "unknown"
        allowed, remaining = self._limiter.allow(client)

        if not allowed:
            response = JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        "Terlalu banyak permintaan dalam waktu singkat. "
                        f"Tunggu sebentar lalu coba lagi (batas "
                        f"{settings.RATE_LIMIT_PER_MINUTE} per menit)."
                    )
                },
                headers={
                    "Retry-After": str(int(WINDOW_SECONDS)),
                    "X-RateLimit-Limit": str(settings.RATE_LIMIT_PER_MINUTE),
                    "X-RateLimit-Remaining": "0",
                },
            )
            await response(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                headers.append((b"x-ratelimit-remaining", str(remaining).encode()))
            await send(message)

        await self.app(scope, receive, send_with_headers)
