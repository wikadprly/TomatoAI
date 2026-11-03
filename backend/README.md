# TomatoAI Backend

REST API untuk klasifikasi tingkat kematangan tomat menggunakan pengolahan citra
dan MobileNetV2.

## Scope Kamera (MVP)

**POST-HARVEST ONLY** — Tomat yang **sudah dipetik** (di tangan, keranjang, meja).
Bukan tomat di pohon (on-vine). Lihat `datasets/README.md` untuk detail.

> **Alasan**: Background bersih → segmentasi HSV sederhana (Tim 1) cukup.
> On-vine (daun, bayangan, oklusi) → versi 2.0.

## Menjalankan

```bash
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Dokumentasi interaktif: <http://localhost:8000/docs>

TensorFlow tidak ikut `requirements.txt` karena ukurannya besar. Instal
secara terpisah:

```bash
pip install -r requirements-ml.txt
```

## Konfigurasi

Salin `.env.example` menjadi `.env`, lalu sesuaikan bila perlu. Semua nilai bisa
juga diisi lewat environment variable tanpa file `.env`.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `MODEL_PATH` | `models/mobilenetv2_tomat.keras` | Lokasi bobot MobileNetV2 |
| `IMAGE_SIZE` | `224` | Ukuran input model |
| `INFERENCE_INPUT_MODE` | `original` | Input model: `original`, `crop`, atau `segment` |
| `CROP_MARGIN_RATIO` | `0.15` | Margin crop di sekitar bbox objek (mode `crop`) |
| `DATASET_DIR` | `datasets` | Folder dataset |
| `MAX_UPLOAD_BYTES` | `5242880` | Batas ukuran upload (5 MB) |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Origin frontend yang diizinkan |

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
  "model_loaded": true
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
| 422 | Gambar bukan satu tomat (guard khusus tomat) |
| 501 | Cadangan: modul pemrosesan citra/model belum diisi |
| 503 | Bobot MobileNetV2 belum tersedia |

## Pembagian modul

- `app/services/image_processing/` - seluruh tahap pemrosesan citra
  (preprocessing, RGB ke HSV, thresholding, masking, morphology, segmentasi,
  analisis warna). Modul ini sudah terisi.
- `app/services/model/` - dataset, training, evaluasi, prediksi. Modul ini
  sudah terisi.

`app/services/pipeline.py` merangkai keduanya:

```text
gambar -> preprocessing -> segmentasi (mask + HSV) -> analisis warna
       -> pilih input (original/crop/segment) -> MobileNetV2
       -> guard khusus tomat -> label + confidence
```

Mode input diatur lewat `INFERENCE_INPUT_MODE`. Default `original` (citra utuh,
sesuai distribusi training). Mode `crop` memotong area objek dari resolusi
penuh memakai bbox mask + margin; mode `segment` memakai citra hasil masking
(latar hitam). Sebelum mengganti default, bandingkan dulu ketiganya pada test
set:

```bash
python -m scripts.evaluate_input_modes --out models/input_mode_comparison.json
```

Skrip ini **tidak** melatih ulang model; ia hanya mengevaluasi bobot yang ada
dengan tiga cara menyiapkan input. Dataset test harus tersedia di
`datasets/test/<kelas>/` (tidak perlu mengunduh ulang kalau masih ada).

Bila segmentasi tidak menemukan objek tomat (mask kosong), pipeline memakai
citra asli tanpa segmentasi dan mengisi `color_analysis` dengan `null`,
supaya model tidak menerima citra hitam semua.

Model disimpan di `backend/models/mobilenetv2_tomat.keras` dan dilatih lewat
`training_colab.ipynb` dengan `rescale=1/255`; tahap prediksi memakai rescale
yang sama.

## Testing

```bash
pytest
```

Test mencakup:

- smoke test FastAPI (`test_health.py`),
- pipeline dataset download/clean/split (`test_*_dataset.py`),
- pengolahan citra: thresholding, segmentasi, analisis warna
  (`test_image_processing.py`),
- integrasi pipeline prediksi, dengan model ditiru
  (`test_pipeline.py`),
- metrik evaluasi, dengan model dan dataset ditiru
  (`test_evaluation.py`).

Test yang butuh TensorFlow (mis. `build_datasets`) di-skip otomatis di mesin
tanpa TensorFlow.
