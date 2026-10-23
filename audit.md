# 🍅 Audit Kelemahan Sistem TomatoAI

> Tanggal audit: 23 Oktober 2026
> Cakupan: branch `prediction-pipeline` (73 file)
> Metode: pembacaan kode, menjalankan test backend, typecheck & lint frontend,
> serta pengujian langsung pipeline segmentasi.

**Ringkasan verifikasi (setelah perbaikan P1–P3, 23 Okt 2026):**

| Pemeriksaan | Hasil |
| --- | --- |
| Backend `pytest` | ✅ 35 passed, 3 skipped (skip = butuh TensorFlow) |
| Frontend `tsc --noEmit` | ✅ Lolos |
| Frontend `eslint` | ✅ 0 masalah (sebelumnya 1 error, 4 warnings) |
| `POST /api/v1/predict` tanpa TF | ✅ 503 dengan pesan jelas (sebelumnya 500) |
| Metrik model (test set 677 citra) | accuracy 0.9232, macro-F1 0.918 |

---

## 🔴 Prioritas 1 — Fatal

### 1.1 `training.py` membuang layer softmax

`backend/app/services/model/training.py` → `_build_model()`:

```python
outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)
model = Model(inputs=base.input, outputs=x, ...)   # ← x = output Dropout (1280-dim)
```

Variabel `outputs` (3 kelas) tidak pernah dipakai. Model yang dibangun beroutput
1280-dim, bukan 3-kelas, sehingga training dari repo akan gagal/crash saat loss
dihitung against one-hot label.

- **Dampak:** siapa pun menjalankan `train()` dari repo menghasilkan model salah.
- **Catatan:** `training_colab.ipynb` menulis versi `Sequential` sendiri via
  `%%writefile`, jadi bobot yang beredar tidak terpengaruh — tetapi terjadi
  **drift** antara notebook dan kode repo.
- **Perbaikan:** `Model(inputs=base.input, outputs=outputs, ...)` + samakan dengan
  versi notebook.

### 1.2 `/predict` meledak 500 saat TensorFlow absen

Route `predict.py` hanya menangkap `ModelNotReadyError` dan `NotImplementedError`.
`load_model()` melempar `ModuleNotFoundError` yang tidak tertangani → 500 Internal
Server Error.

Kondisi terkonfirmasi di mesin ini:

```
GET  /api/v1/health → {"model_loaded": true}   # hanya cek Path.is_file()
POST /api/v1/predict → 500 ModuleNotFoundError: No module named 'tensorflow'
```

- **Dampak:** health menyiarkan "siap" padahal prediksi pasti gagal — menyesatkan.
- **Perbaikan:**
  1. Tangkap `ImportError` di route → 503 dengan pesan "install requirements-ml.txt".
  2. `model_loaded` di health menguji import TensorFlow, bukan sekadar keberadaan file.

---

## 🟠 Prioritas 2 — Signifikan

### 2.1 Segmentasi hanya menangkap merah/jingga

`segmentation.py` memakai `hue_range=(160, 20)` (sudut merah pada dua ujung Hue).
Diuji langsung dengan citra sintetis 300×300 pada latar polos:

| Warna tomat | Piksel mask | `color_analysis` |
| --- | --- | --- |
| Merah | 32.400 | ✅ terisi |
| Jingga | 32.400 | ✅ terisi |
| Kuning | **0** | ❌ `None` |
| Hijau (kelas `mentah`) | **0** | ❌ `None` |

- **Dampak:** kartu "Analisis Warna HSV" di halaman Hasil tidak pernah muncul untuk
  kelas `mentah` — 1 dari 3 kelas. Bukan fatal (model tetap menerima citra asli
  dan pipeline menangani mask kosong dengan benar), tetapi janji fitur UI tidak
  terpenuhi.
- **Perbaikan:** tambahkan rentang hijau/kuning, mis. `(160, 20) ∪ (25, 90)`.

### 2.2 Endpoint `async` menjalankan inferensi sinkron

`async def predict` memanggil `classify_tomato()` (inferensi CPU ratusan ms)
langsung di event loop → semua request lain (termasuk `/health`) ikut macet selama
prediksi berjalan.

- **Perbaikan:** hapus `async` (FastAPI menjalankan def biasa di threadpool), atau
  bungkus dengan `run_in_executor`.

### 2.3 Fallback client-side diam-diam menggantikan hasil AI

`ImageDropzone.handleSubmit`: **semua** error backend (413/415/500/timeout) jatuh ke
`analyzeTomatoClientSide()`. Fallback ini memang membaca piksel asli untuk HSV, tetapi
confidence-nya **hardcoded** (0.958 / 0.892 / 0.964) tanpa hubungan dengan citra, dan
halaman Hasil tetap menampilkan judul *"Distribusi Keyakinan MobileNetV2"*.

- **Dampak:** user tersesat percaya hasil heuristic warna adalah output model.
- **Perbaikan:** tandai hasil client-side sebagai "heuristik warna (offline)" di
  response dan di UI; jangan fallback untuk error validasi (413/415).

---

## 🟡 Prioritas 3 — Minor / kebersihan kode

### 3.1 Upload dibaca penuh sebelum cek ukuran

Route memanggil `await file.read()` **sebelum** membandingkan `MAX_UPLOAD_BYTES`.
Upload raksasa tetap terbaca penuh ke memori sebelum ditolak 413.

- **Perbaikan:** cek `Content-Length` lebih dulu, atau baca streaming dengan batas.

### 3.2 Freeze BatchNorm tak pernah aktif

`_unfreeze_top_layers()`:

```python
if isinstance(layer, type) and "BatchNormalization" in layer.__class__.__name__:
```

`isinstance(layer, type)` selalu `False` untuk *instance* layer → BatchNorm tetap
trainable saat fine-tuning (melanggar best practice, bisa mengubah statistik
inference).

### 3.3 Lint frontend gagal

- ❌ **Error:** `hasil/page.tsx:27` — `setIsClient(true)` dipanggil sinkron di dalam
  `useEffect` (`react-hooks/set-state-in-effect`).
- ⚠️ **Warning:** `ImageDropzone.tsx` — `getMockDetection` diimpor tapi tak dipakai.
- ⚠️ **Warning:** `clientClassifier.ts` — `conf` (3 tempat) di-assign tapi tak dipakai.

### 3.4 Dua sistem state paralel di frontend

- `lib/storage.ts` (localStorage/sessionStorage) — **dipakai** halaman deteksi & hasil.
- `lib/prediction-context.tsx` (baru, belum ter-commit) — **tidak diimpor oleh file
  mana pun**; `layout.tsx` saat ini tidak memasang `PredictionProvider`.

Keduanya menyimpan hasil prediksi dengan key berbeda (`tomatoai:result` vs
`tomatoai_latest_detection`) → duplikasi & sumber kebingungan. Putuskan: pasang
provider dan pindahkan halaman ke context, atau hapus file yang tidak dipakai.

### 3.5 File model 9,6 MB ter-commit di Git

`backend/models/mobilenetv2_tomat.keras` sudah ter-track meski `backend/.gitignore`
berisi `models/*` (kemungkinan di-add sebelum aturan ignore dibuat). Repo jadi berat;
seharusnya dibagikan lewat GitHub Release/Drive sesuai komentar di `.gitignore`.

---

## ✅ Kekuatan yang perlu dipertahankan

- Pemisahan modul rapi: `image_processing/` | `model/` | `pipeline.py` sebagai perangkai.
- Docstring berkualitas dan jujur — termasuk penjelasan *mengapa* model menerima
  citra asli, bukan hasil segmentasi.
- 31 test berjenjang: unit image-processing, pipeline dengan mock model, integrasi API.
- Kebijakan data solid: dataset CC0, dedup MD5 anti-bocor split, stratified 70:15:15,
  class-weighting untuk imbalance ~1:3:1.
- Konsistensi preprocessing train/infer (rescale 1/255) — jebakan klasik transfer
  learning yang sudah dihindari dan didokumentasikan.
- Batas upload 5 MB + allowlist content-type di sisi backend, divalidasi ganda di frontend.

---

## 📋 Rencana perbaikan & status

| # | Tugas | Prioritas | Status |
| --- | --- | --- | --- |
| 1 | Perbaiki `Model(outputs=x)` di `training.py` | 🔴 | ✅ Selesai |
| 2 | Tangani `ImportError` di route predict → 503; `model_loaded` di health uji TF | 🔴 | ✅ Selesai |
| 3 | Perluas threshold HSV agar tomat hijau/kuning tersegmentasi | 🟠 | ✅ Selesai |
| 4 | Jadikan endpoint predict threadpool (hapus `async`) | 🟠 | ✅ Selesai |
| 5 | Tandai hasil fallback client-side sebagai heuristic, jangan fallback pada 400/413/415 | 🟠 | ✅ Selesai |
| 6 | Cek ukuran upload sebelum membaca body | 🟡 | ✅ Selesai |
| 7 | Perbaiki freeze BatchNorm (`isinstance(layer, BatchNormalization)`) | 🟡 | ✅ Selesai |
| 8 | Perbaiki lint error `hasil/page.tsx` + bersihkan warning unused vars | 🟡 | ✅ Selesai |
| 9 | Putuskan nasib `prediction-context.tsx` — diputuskan: **hapus** (dead code) | 🟡 | ✅ Selesai |
| 10 | Untrack file model 9,6 MB dari Git | 🟡 | ⏸️ Ditunda — diputuskan bobot tetap ter-commit |

### Catatan implementasi (23 Okt 2026)

- `predict.py` menjadi endpoint sync; pembacaan file lewat `file.file.read()`
  (SpooledTemporaryFile) karena `UploadFile.read()` selalu async.
- `hasil/page.tsx` memakai lazy initializer `useState` + `useSyncExternalStore`
  untuk isClient, sehingga tidak ada `setState` di dalam `useEffect`.
- Test regresi ditambah: 503 saat dependency ML absen, 400 file kosong,
  413 kebesaran, segmentasi hijau/kuning.
- Hasil akhir: backend **35 passed, 3 skipped**; frontend **lint 0 masalah,
  typecheck lolos**.
