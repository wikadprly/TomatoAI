# 🚀 Panduan Deploy TomatoAI

Panduan ini sudah diverifikasi di Windows (Python 3.13 + Node). Prinsipnya:
**training TIDAK dijalankan saat deploy** — cukup bawa file model + kode inferensi.

## Yang dibutuhkan server

| Perlu ✅ | Tidak perlu ❌ |
|---|---|
| `backend/models/mobilenetv2_tomat.keras` (bawa dari repo) | `datasets/` (ratusan MB) |
| `backend/models/metrics.json` (dokumentasi metrik) | `training_colab.ipynb` |
| `requirements.txt` + `requirements-ml.txt` | `training.py`, `evaluation.py`, `scripts/` |
| Kode `backend/app/` (API + pipeline inferensi) | — |
| `frontend/` (build Next.js) | — |

> Catatan: `training.py`/`evaluation.py` ada di dalam `app/` tapi **tidak pernah
> dipanggil** oleh endpoint API — hanya dipakai saat training manual. Aman dibawa
> atau dibuang; yang wajib hanya route + `pipeline.py` + `predictor.py` +
> `image_processing/`.

## 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-ml.txt  # wajib — TensorFlow untuk prediksi AI

# Env (opsional, default sudah benar untuk lokal)
export MODEL_PATH=models/mobilenetv2_tomat.keras
export CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Cek sehat:** `GET /api/v1/health` harus `"model_loaded": true`.

| `model_loaded` | Artinya |
|---|---|
| `true` | AI siap — `/predict` akan memakai MobileNetV2 |
| `false` | TF/bobot tidak ada → `/predict` balas 503 → frontend jatuh ke heuristik |

## 2. Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local         # isi NEXT_PUBLIC_API_BASE_URL = URL backend
npm ci
npm run build
npm start                          # port 3000
```

`.env.local` production contohnya:

```
NEXT_PUBLIC_API_BASE_URL=https://api-domain-kamu.com
```

Backend harus mengizinkan origin frontend lewat `CORS_ORIGINS` (pisah koma).

## 3. Verifikasi setelah deploy

```bash
curl https://API-DOMAIN/api/v1/health          # → model_loaded: true
curl -F "file=@foto_tomat.jpg" https://API-DOMAIN/api/v1/predict
                                              # → label + confidence + color_analysis
```

Di UI: unggah foto → judul kartu probabilitas harus **"Distribusi Keyakinan
MobileNetV2"**. Kalau muncul banner kuning **"Hasil Heuristik Warna — Bukan
Output AI"**, berarti backend/TF belum terjangkau — cek poin di atas.

## 4. `models/metrics.json` — hasil training dalam format JSON

File ini berisi accuracy, F1, confusion matrix, dan laporan per kelas hasil
evaluasi test set. **Otomatis ditulis** setiap kali `training.py` selesai, atau
regenerasi manual tanpa training ulang:

```bash
cd backend
python -m scripts.export_metrics     # butuh dataset uji + TensorFlow
```

Untuk deploy, file ini cukup dibawa apa adanya (sudah ter-commit di repo) —
berguna untuk membuktikan performa model di laporan/README tanpa membuka
notebook.

## 5. Checklist ringkas

- [ ] `pip install -r requirements.txt && pip install -r requirements-ml.txt`
- [ ] `GET /api/v1/health` → `model_loaded: true`
- [ ] `CORS_ORIGINS` mencakup origin frontend
- [ ] `NEXT_PUBLIC_API_BASE_URL` menunjuk ke backend yang benar
- [ ] Upload foto uji → muncul "MobileNetV2", bukan banner heuristik
- [ ] `metrics.json` ikut ter-deploy (opsional, untuk dokumentasi)
