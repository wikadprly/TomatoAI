"""State runtime proses (uptime, versi proses).

Dipisah dari ``config`` karena nilainya berubah setiap kali server dijalankan,
bukan konfigurasi.
"""

from __future__ import annotations

import time

__all__ = ["STARTED_AT", "uptime_seconds"]

STARTED_AT = time.time()


def uptime_seconds() -> float:
    """Lama proses berjalan dalam detik."""
    return round(time.time() - STARTED_AT, 1)
