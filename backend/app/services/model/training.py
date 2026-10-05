"""Training dan fine-tuning MobileNetV2.

Rencana kerja yang diharapkan:
1. Muat MobileNetV2 pretrained dengan `weights="imagenet"`.
2. Ganti head/classifier menjadi 3 kelas sesuai `settings.CLASS_NAMES`.
3. Fine-tune beberapa epoch, idealnya dua tahap:
   - bekukan backbone, latih classifier dulu,
   - lalu buka sebagian layer backbone dengan learning rate kecil.
4. Simpan bobot terbaik ke `settings.MODEL_PATH` (format `.h5` atau `.keras`).

Catatan: epoch, batch size, learning rate, dan augmentation sebaiknya
dicatat di laporan sj ah, bukan ditebak.
"""

TODO = "Isi model/training.py"


def train():
    """Jalankan training / fine-tuning MobileNetV2.

    Returns:
        Objek history training berisi akurasi dan loss per epoch.
    """
    raise NotImplementedError(TODO)


def save_model(model, path=None) -> str:
    """Simpan bobot model ke disk.

    Args:
        model: Model hasil training.
        path: Lokasi simpan. Kalau `None`, pakai `settings.MODEL_PATH`.

    Returns:
        Path file bobot yang tersimpan.
    """
    raise NotImplementedError(TODO)