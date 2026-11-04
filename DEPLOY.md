# 🚀 Panduan Deploy TomatoAI

Panduan ini sudah diverifikasi di Windows (Python 3.13 + Node). Prinsipnya:
**training TIDAK dijalankan saat deploy** — cukup bawa file model + kode inferensi.

## Yang dibutuhkan server

| Perlu ✅ | Tidak perlu ❌ |
|---|---|
| `backend/models/mobilenetv2_tomat.keras` (bawa dari repo) | `datasets/` (ratusan MB) |
| `backend/models/metrics.json` (dokumentasi metrik) | `training_colab.ipynb` |
| `requirements-prod.txt` (atau `requirements.txt` + `requirements-ml.txt`) | `training.py`, `evaluation.py`, `scripts/` |
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

## 2. Deploy backend gratis via Docker (Hugging Face Spaces)

`backend/Dockerfile` sudah disiapkan untuk Space ber-SDK **Docker**. Image ini
memakai `requirements-prod.txt` (tanpa kaggle/pytest/matplotlib/scikit-learn)
dan port **7860** sesuai default HF Spaces.

1. Buat Space baru → pilih SDK **Docker** → blank.
2. Jadikan isi folder `backend/` sebagai root repo Space (Dockerfile,
   `app/`, `models/`, `requirements-prod.txt`).
3. Di **Settings → Variables and secrets**, set:
   - `CORS_ORIGINS` = `https://<domain-vercel-kamu>` (wajib, tanpa ini browser diblokir)
   - opsional `MODEL_PATH=models/mobilenetv2_tomat.keras`
4. Tunggu build. Cek `https://<user>-<space>.hf.space/api/v1/health` →
   `model_loaded: true`.

Catatan free tier: Space **tidur setelah ±48 jam idle**, request pertama bisa
lambat (cold start) — timeout frontend sudah dinaikkan ke 90 detik.

## 3. Frontend (Next.js)

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

## 4. Verifikasi setelah deploy

```bash
curl https://API-DOMAIN/api/v1/health          # → model_loaded: true
curl -F "file=@foto_tomat.jpg" https://API-DOMAIN/api/v1/predict
                                              # → label + confidence + color_analysis
```

Di UI: unggah foto → judul kartu probabilitas harus **"Distribusi Keyakinan
MobileNetV2"**. Kalau muncul banner kuning **"Hasil Heuristik Warna — Bukan
Output AI"**, berarti backend/TF belum terjangkau — cek poin di atas.

Guard "khusus tomat" aktif sebagai jaring pengaman kedua: bila model memilih
kelas `bukan_tomat` (jeruk, apel, objek lain), API membalas **200** dengan
label `bukan_tomat` — guard bentuk dilewati, karena kelas itu memang tidak
dilatih lewat mask tomat. Bila model tetap memilih kelas kematangan tetapi
bentuknya bukan satu tomat (pemandangan/orang/objek tak bulat, atau mask
kosong), API membalas **422** dengan pesan alasan. Atur ambangnya lewat env
`MIN_*`/`MAX_*`, atau matikan dengan `TOMATO_GUARD_ENABLED=0`.

## 5. `models/metrics.json` — hasil training dalam format JSON

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

## 6. Langkah cepat — siap tempel (model 4 kelas)

Asumsi: training 4 kelas selesai, `metrics.json` hijau, semua test lulus.
Ganti `<user>` dan `<space>` dengan punya kamu.

### 6.1 Commit & push

```bash
cd TomatoAI
git add -A
git commit -m "feat: model 4 kelas + kelas penolakan bukan_tomat"
git push origin HEAD
```

### 6.2 Backend → Hugging Face Spaces (Docker)

```bash
# 1. Buat Space: https://huggingface.co/new-space → SDK "Docker" → blank
# 2. Upload isi backend/ sebagai root Space
pip install -U huggingface_hub
huggingface-cli login                 # tempel token HF (role write)
cd backend
huggingface-cli upload <user>/<space> . --repo-type=space \
  --exclude "datasets/**" --exclude ".venv/**" --exclude "**/__pycache__/**"
```

3. Di Space → **Settings → Variables and secrets** tambah:
   - `CORS_ORIGINS` = `https://<nama-aplikasi-vercel>.app` (wajib)
4. Tunggu build, lalu cek:

```bash
curl -s https://<user>-<space>.hf.space/api/v1/health
# → "model_loaded": true
```

### 6.3 Frontend → Vercel

1. Import repo → **Root Directory**: `frontend` → Framework: Next.js.
2. Tambah Environment Variable (lalu **Redeploy**, karena `NEXT_PUBLIC_*`
   dibakar saat build):
   - `NEXT_PUBLIC_API_BASE_URL` = `https://<user>-<space>.hf.space`
3. Deploy.

### 6.4 Smoke test wajib

```bash
API=https://<user>-<space>.hf.space

# 1. Sehat?
curl -s $API/api/v1/health

# 2. Foto jeruk/apel → HARUS label "bukan_tomat" (200), bukan kematangan
curl -s -o /dev/null -w "%{http_code}\n" -F "file=@foto_jeruk.jpg" $API/api/v1/predict
curl -s -F "file=@foto_jeruk.jpg" $API/api/v1/predict | grep bukan_tomat

# 3. Foto tomat → HARUS salah satu kelas kematangan (200) atau 422
curl -s -F "file=@foto_tomat.jpg" $API/api/v1/predict
```

### 6.5 Anti-tidur (cold start ±48 jam)

Space free tier tidur setelah idle. Pasang monitor yang ping tiap ≤45 menit,
mis. UptimeRobot (gratis) atau cron GitHub Actions:

```yaml
# .github/workflows/warmup.yml
on:
  schedule: [{ cron: "20 */3 * * *" }]   # tiap 3 jam
  workflow_dispatch: {}
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -sf https://<user>-<space>.hf.space/api/v1/health > /dev/null
```

## 7. Checklist ringkas

- [ ] Lokal: `pip install -r requirements.txt && pip install -r requirements-ml.txt`
- [ ] Docker: build `backend/Dockerfile` (pakai `requirements-prod.txt`, port 7860)
- [ ] `GET /api/v1/health` → `model_loaded: true`
- [ ] `CORS_ORIGINS` mencakup origin frontend (domain Vercel)
- [ ] `NEXT_PUBLIC_API_BASE_URL` menunjuk ke backend yang benar
- [ ] Upload foto uji → muncul "MobileNetV2", bukan banner heuristik
- [ ] Foto jeruk → label `bukan_tomat`, bukan `setengah_matang`
- [ ] Cold start HF Space terlewati (< 90 detik) atau Space di-warm-up
- [ ] `metrics.json` ikut ter-deploy (opsional, untuk dokumentasi)
