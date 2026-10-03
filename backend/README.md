# TomatoAI Backend

REST API untuk klasifikasi tingkat kematangan tomat menggunakan pengolahan citra
dan MobileNetV2.

## Menjalankan

```bash
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Dokumentasi interaktif: <http://localhost:8000/docs>

TensorFlow tidak ikut `requirements.txt` karena ukurannya besar. Tim 2
menginstalnya secara terpisah:

```bash
pip install -r requirements-ml.txt
```

## Konfigurasi

Salin `.env.example` menjadi `.env`, lalu sesuaikan bila perlu. Semua nilai bisa
juga diisi lewat environment variable tanpa file `.env`.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `MODEL_PATH` | `models/mobilenetv2_tomat.h5` | Lokasi bobot MobileNetV2 |
| `IMAGE_SIZE` | `224` | Ukuran input model |
| `DATASET_DIR` | `datasets` | Folder dataset |
| `MAX_UPLOAD_BYTES` | `5242880` | Batas ukuran upload (5 MB) |
| `CORS_ORIGINS` | `http://localhost:3000` | Origin frontend yang diizinkan |

## Endpoint

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/` | Informasi singkat aplikasi |
| GET | `/api/v1/health` | Status backend dan status ketersediaan model |
| POST | `/api/v1/predict` | Klasifikasi satu gambar tomat |

### `GET /api/v1/health`

```json
{
  "status": "ok",
  "app": "TomatoAI API",
  "version": "0.1.0",
  "model_loaded": false
}
```

### `POST /api/v1/predict`

Kirim `multipart/form-data` dengan field `file` berisi gambar (jpeg, png, atau
webp).

Kode error yang mungkin muncul:

| Kode | Arti |
| --- | --- |
| 400 | File gambar kosong |
| 413 | Ukuran file melebihi `MAX_UPLOAD_BYTES` |
| 415 | Format gambar tidak didukung |
| 501 | Modul pemrosesan Tim 1 atau Tim 2 belum diisi |
| 503 | Bobot MobileNetV2 belum tersedia |

## Pembagian tim

- `app/services/image_processing/` - **Tim 1**: seluruh tahap pemrosesan citra.
- `app/services/model/` - **Tim 2**: dataset, training, evaluasi, prediksi.

Fungsi di kedua folder tersebut masih kosong dan sengaja `raise
NotImplementedError` supaya tidak ada hasil klasifikasi palsu. Backend baru
dapat mengembalikan prediksi setelah Tim 2 membuat bobot model.

## Testing

```bash
pytest
```

Isi test sekarang hanya smoke test: memastikan aplikasi bisa dimuat dan route
`health` berjalan.