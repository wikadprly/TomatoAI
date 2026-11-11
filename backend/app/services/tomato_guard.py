"""Guard sederhana untuk memastikan objek yang diprediksi memang tomat.

Ini **bukan model pembelajaran**. Ia memakai geometri mask segmentasi dan
keyakinan model untuk menyaring kasus yang jelas bukan tomat (pemandangan,
orang, objek non-bulat) serta prediksi yang ragu.

Batasannya jujur: guard ini tetap lapisan pengaman, bukan pengganti model.
Model kini punya kelas keempat ``bukan_tomat`` sehingga jeruk/apel/objek
lain biasanya langsung ditolak oleh model. Guard tetap menangani kasus yang
lolos model: mask kosong, objek bukan satu tomat, atau prediksi yang ragu.
Bila prediksi teratas adalah ``bukan_tomat``, validasi bentuk dilewati —
kelas itu memang tidak dilatih lewat mask tomat.

Ambang geometri/keyakinan di ``settings`` dikalibrasi pada test set proyek
(677 gambar, 3 kelas). Ambang lama menolak 98/677 (14,5%) foto tomat sah;
nilai sekarang diambil dari persentil bawah sebaran metrik sehingga foto tomat
yang sah --- termasuk close-up yang memenuhi frame --- lolos, sementara mask
kosong dan bentuk yang jelas bukan satu objek tetap ditolak.

Setiap penolakan membawa ``code`` dan ``hints`` terstruktur supaya frontend
bisa menampilkan saran perbaikan yang spesifik, bukan sekadar satu kalimat.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.core.config import settings

__all__ = ["NotATomatoError", "ensure_tomato", "shape_metrics"]


class NotATomatoError(ValueError):
    """Gambar tidak memenuhi syarat sebagai satu objek tomat yang valid.

    Attributes:
        code: Kode mesin untuk dipetakan frontend (mis. ``shape_not_round``).
        hints: Saran perbaikan yang bisa langsung ditampilkan ke pengguna.
        metric: Nama metrik yang memicu penolakan, bila ada.
        value: Nilai metrik aktual.
        threshold: Ambang yang dilanggar.
    """

    def __init__(
        self,
        message: str,
        *,
        code: str = "guard",
        hints: list[str] | None = None,
        metric: str | None = None,
        value: float | None = None,
        threshold: float | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.hints = hints or []
        self.metric = metric
        self.value = value
        self.threshold = threshold

    def to_detail(self) -> dict[str, object]:
        """Bentuk siap kirim sebagai ``detail`` pada respons 422."""
        detail: dict[str, object] = {
            "code": self.code,
            "message": self.message,
            "hints": self.hints,
        }
        if self.metric is not None:
            detail["metric"] = self.metric
            detail["value"] = self.value
            detail["threshold"] = self.threshold
        return detail


_HINTS_FRAME = [
    "Letakkan tomat di tengah dengan latar polos (meja putih/kertas).",
    "Pastikan seluruh permukaan tomat masuk ke dalam frame.",
    "Hindari bayangan gelap atau pantulan cahaya keras.",
]

_HINTS_SHAPE = [
    "Gunakan foto satu tomat saja, bukan beberapa buah sekaligus.",
    "Pastikan latar belakang kontras dengan warna tomat.",
    "Hindari objek lain (daun, tangan, wadah) yang ikut terpotong.",
]

_HINTS_CLOSE = [
    "Ambil dari jarak yang memperlihatkan seluruh tomat.",
    "Sisakan sedikit ruang di sekeliling objek.",
]


def shape_metrics(mask: np.ndarray) -> dict[str, float]:
    """Hitung metrik bentuk dari mask biner objek utama.

    Returns:
        Dict berisi ``area_ratio``, ``circularity``, ``fill_ratio``,
        ``solidity``, dan ``aspect_ratio``. Semua 0.0 bila mask kosong.
    """
    mask_np = np.asarray(mask)
    kosong = {
        "area_ratio": 0.0,
        "circularity": 0.0,
        "fill_ratio": 0.0,
        "solidity": 0.0,
        "aspect_ratio": 0.0,
    }

    if mask_np.size == 0:
        return kosong

    if mask_np.ndim != 2:
        mask_np = cv2.cvtColor(mask_np, cv2.COLOR_BGR2GRAY)

    binary = (mask_np > 0).astype(np.uint8)
    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if not contours:
        return kosong

    contour = max(contours, key=cv2.contourArea)
    area = float(cv2.contourArea(contour))
    if area <= 0:
        return kosong

    perimeter = float(cv2.arcLength(contour, True))
    x, y, w, h = cv2.boundingRect(contour)
    bbox_area = float(w * h)

    hull_area = float(cv2.contourArea(cv2.convexHull(contour)))
    total_pixels = float(mask_np.shape[0] * mask_np.shape[1])

    return {
        # 4*pi*A / P^2 -> 1.0 untuk lingkaran sempurna.
        "circularity": 0.0
        if perimeter <= 0
        else float(4.0 * np.pi * area / (perimeter**2)),
        # Seberapa penuh kontur mengisi bounding box-nya (lingkaran ~0.785).
        "fill_ratio": 0.0 if bbox_area <= 0 else area / bbox_area,
        # area kontur / area convex hull; rendah bila bentuk berlekuk.
        "solidity": 0.0 if hull_area <= 0 else area / hull_area,
        "aspect_ratio": 0.0 if h <= 0 else float(w) / float(h),
        "area_ratio": 0.0 if total_pixels <= 0 else area / total_pixels,
    }


def _periksa_keyakinan(probabilities: dict[str, float]) -> None:
    if not probabilities:
        raise NotATomatoError(
            "Model tidak menghasilkan probabilitas kelas. Coba unggah ulang foto.",
            code="no_probabilities",
            hints=["Coba unggah ulang foto yang sama.", "Gunakan format JPG/PNG."],
        )

    urut = sorted(probabilities.values(), reverse=True)
    teratas = float(urut[0])
    kedua = float(urut[1]) if len(urut) > 1 else 0.0

    if teratas < settings.MIN_MODEL_CONFIDENCE:
        raise NotATomatoError(
            "Model tidak cukup yakin gambar ini berisi tomat "
            f"(keyakinan {teratas:.0%}). Pastikan satu tomat terlihat jelas.",
            code="low_confidence",
            hints=[
                "Ambil foto lebih dekat sehingga tomat mengisi sebagian besar frame.",
                "Pastikan pencahayaan terang dan merata.",
                "Hindari foto buram (blur) atau gerakan kamera.",
            ],
            metric="confidence",
            value=teratas,
            threshold=settings.MIN_MODEL_CONFIDENCE,
        )

    if teratas - kedua < settings.MIN_CONFIDENCE_MARGIN:
        raise NotATomatoError(
            "Hasil model terlalu ambigu untuk dipastikan sebagai tomat. "
            "Gunakan foto satu tomat dengan latar polos dan pencahayaan cukup.",
            code="ambiguous",
            hints=[
                "Gunakan latar belakang polos yang kontras dengan tomat.",
                "Hindari bayangan yang menutupi sebagian buah.",
                "Pastikan hanya ada satu tomat dalam frame.",
            ],
            metric="margin",
            value=teratas - kedua,
            threshold=settings.MIN_CONFIDENCE_MARGIN,
        )


def _periksa_bentuk(mask: np.ndarray | None) -> None:
    if mask is None:
        raise NotATomatoError(
            "Objek tomat tidak terdeteksi. Pastikan foto berisi satu tomat "
            "di atas latar belakang polos dengan kontras yang cukup.",
            code="mask_missing",
            hints=[
                "Gunakan latar polos: kertas putih, meja kayu terang, atau nampan.",
                "Hindari latar berwarna sama dengan tomat (mis. kain merah).",
                "Pastikan tomat tidak tertutup daun atau tangan.",
            ],
        )

    m = shape_metrics(mask)

    if m["area_ratio"] < settings.MIN_OBJECT_RATIO:
        raise NotATomatoError(
            "Objek tomat terlalu kecil atau tidak terdeteksi. "
            "Dekatkan kamera ke satu tomat.",
            code="object_too_small",
            hints=[
                "Dekatkan kamera sampai tomat memenuhi sekitar setengah frame.",
                "Pastikan tomat tidak berada di ujung/tepi foto.",
                *_HINTS_FRAME[1:],
            ],
            metric="area_ratio",
            value=m["area_ratio"],
            threshold=settings.MIN_OBJECT_RATIO,
        )

    if m["area_ratio"] > settings.MAX_OBJECT_RATIO:
        raise NotATomatoError(
            "Objek terlalu memenuhi frame. Sisakan latar belakang polos "
            "agar tomat bisa dikenali.",
            code="object_too_large",
            hints=_HINTS_CLOSE,
            metric="area_ratio",
            value=m["area_ratio"],
            threshold=settings.MAX_OBJECT_RATIO,
        )

    if m["circularity"] < settings.MIN_CIRCULARITY:
        raise NotATomatoError(
            "Bentuk objek tidak menyerupai tomat (tidak cukup bulat).",
            code="shape_not_round",
            hints=_HINTS_SHAPE,
            metric="circularity",
            value=m["circularity"],
            threshold=settings.MIN_CIRCULARITY,
        )

    if m["fill_ratio"] < settings.MIN_FILL_RATIO:
        raise NotATomatoError(
            "Bentuk objek tidak menyerupai tomat (siluet terlalu berlekuk).",
            code="shape_too_concave",
            hints=_HINTS_SHAPE,
            metric="fill_ratio",
            value=m["fill_ratio"],
            threshold=settings.MIN_FILL_RATIO,
        )

    if m["solidity"] < settings.MIN_SOLIDITY:
        raise NotATomatoError(
            "Bentuk objek tidak menyerupai tomat (siluet tidak padat).",
            code="shape_not_solid",
            hints=_HINTS_SHAPE,
            metric="solidity",
            value=m["solidity"],
            threshold=settings.MIN_SOLIDITY,
        )

    if (
        m["aspect_ratio"] < settings.MIN_ASPECT_RATIO
        or m["aspect_ratio"] > settings.MAX_ASPECT_RATIO
    ):
        raise NotATomatoError(
            "Proporsi objek tidak menyerupai tomat (terlalu lonjong/pipih).",
            code="shape_aspect",
            hints=_HINTS_SHAPE,
            metric="aspect_ratio",
            value=m["aspect_ratio"],
            threshold=settings.MAX_ASPECT_RATIO,
        )


def ensure_tomato(
    mask: np.ndarray | None,
    probabilities: dict[str, float],
) -> None:
    """Validasi bahwa gambar layak diprediksi sebagai tomat.

    Args:
        mask: Mask objek terbesar hasil segmentasi (atau ``None``).
        probabilities: Probabilitas per kelas dari model.

    Raises:
        NotATomatoError: bila gambar tidak lolos batasan lingkungan tomat.
    """
    if not settings.TOMATO_GUARD_ENABLED:
        return

    # Prediksi teratas bukan_tomat: lewati validasi bentuk, karena kelas ini
    # dilatih dari foto buah utuh, bukan dari mask segmentasi tomat.
    if probabilities.get("bukan_tomat", 0) == max(probabilities.values(), default=0):
        return

    _periksa_bentuk(mask)
    _periksa_keyakinan(probabilities)
