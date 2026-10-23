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

### 1.3 Lingkungan ML tidak reproducible di Python 3.13

`backend/requirements-ml.txt` mem-pin `tensorflow==2.18.0`, sedangkan venv saat
ini memakai **Python 3.13.14**. TensorFlow 2.18 hanya menyediakan wheel untuk
Python 3.9–3.12; percobaan instalasi menghasilkan:

```
ERROR: Could not find a version that satisfies the requirement tensorflow==2.18.0
       (from versions: 2.20.0rc0, 2.20.0, 2.21.0rc0, 2.21.0, 2.22.0rc0)
```

- **Dampak:** bagian AI/MobileNetV2 tidak bisa dijalankan di environment saat ini;
  backend hanya melayani health dan fallback heuristik. Test ML juga di-skip.
- **Perbaikan yang disarankan:** buat venv baru dengan **Python 3.12**, lalu
  `pip install -r requirements.txt` + `pip install -r requirements-ml.txt`.
  Ini paling aman karena sesuai lockfile dan hasil training di notebook.
- **Alternatif:** tetap di Python 3.13 dan naikkan pin ke `tensorflow==2.20.0`
  atau `2.21.0`, lalu uji ulang load model + prediksi. Opsi ini mengubah stack
  (Keras/numpy) sehingga lebih berisiko untuk reproduksibilitas.
- **Catatan koordinasi:** ini temuan environment, bukan instruksi mengubah repo.
  Jangan ubah `requirements-ml.txt` sendirian; biarkan tim ML memutuskan apakah
  tetap di Python 3.12 + TF 2.18 atau pindah ke TF 2.20/2.21. Perbaikan lokal
  cukup membuat venv Python 3.12 tanpa menyentuh file bersama.

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

`ImageDropzone.handleSubmit`: error non-validasi (koneksi putus, 500, 503, timeout)
jatuh ke `analyzeTomatoClientSide()`. Error 400/413/415 sudah dikecualikan dengan
benar, jadi file yang ditolak server tidak di-fallback. Namun fallback HSV tetap
memakai confidence **hardcoded** (0.958 / 0.892 / 0.964) tanpa hubungan dengan
citra, dan halaman Hasil masih menampilkan judul *"Distribusi Keyakinan
MobileNetV2"*.

- **Dampak:** user tersesat percaya hasil heuristic warna adalah output model.
- **Perbaikan:** tandai hasil client-side sebagai "heuristik warna (offline)" di
  response dan di UI. Bagian validasi 400/413/415 sudah selesai; yang tersisa
  adalah penandaan UI dan penanganan 500/503.

### 2.4 Hasil demo tersimpan sebagai `source: "model"`

`frontend/src/app/hasil/page.tsx` → `handleLoadDemo()`:

```ts
saveDetectionResult(mock.result, undefined, mock.fileName);
```

Argumen keempat (`source`) tidak diisi, sehingga `storage.ts` memakai default
`"model"`. Saat itu UI masih menampilkan banner demo karena `currentRecord`
memakai id `mock_*`, tetapi record yang masuk ke `localStorage` ber-id `det_*`
dan berlabel model. Setelah reload, riwayat menampilkan data sampel sebagai
hasil MobileNetV2.

- **Dampak:** klaim hasil AI palsu saat presentasi; sulit dibedakan dari
  prediksi asli.
- **Perbaikan:** kirim `"demo"` sebagai argumen keempat; pertimbangkan tidak
  menyimpan demo ke riwayat sama sekali.

### 2.5 Tanda hasil heuristik masih terlalu lembut

Fallback heuristik sekarang hanya mengganti judul kecil di kartu probabilitas.
Kartu utama tetap menampilkan "Keyakinan" dan deskripsi halaman tetap
"Evaluasi ... berbasis MobileNetV2". Karena backend tanpa TF membalas 503,
fallback ini justru jadi jalur utama di mesin saat ini.

- **Dampak:** pengguna/penguji mengira confidence 95% berasal dari CNN.
- **Perbaikan:** banner kuning besar saat `source === "heuristic"`, ganti istilah
  "Keyakinan" menjadi "Skor heuristik", dan tampilkan status backend/model.

### 2.6 Format upload frontend dan backend tidak konsisten

`ImageDropzone` menerima `image/*` atau ekstensi `jpg|png|webp|bmp|jfif`,
sedangkan backend hanya mengizinkan JPEG/PNG/WebP. BMP, JFIF, GIF, atau SVG bisa
masuk preview lalu ditolak 415. Teks UI juga kontradiktif: "Mendukung semua
format gambar JPG, PNG, atau WebP".

- **Perbaikan:** samakan `accept` + validasi client dengan allowlist backend,
  atau konversi semua gambar ke JPEG lewat canvas sebelum dikirim.

### 2.7 "Sampel Tomat" adalah gambar sintetis

`createTomatoCanvas()` menggambar tomat kartun dari gradient di canvas, lalu
mengirimnya ke model seolah foto asli. Tombolnya berbunyi "coba langsung dengan
sampel tomat", sehingga menyesatkan. Prediksi MobileNetV2 pada gambar sintetis
bisa tidak sesuai tombol.

- **Perbaikan:** simpan 3 foto asli dari dataset di `frontend/public/samples/`
  dan pakai itu; kalau tetap sintetis, beri label "ilustrasi".

### 2.8 Hapus riwayat tidak menghapus hasil terbaru

`clearDetectionHistory()` hanya menghapus key riwayat, tidak menghapus
`tomatoai_latest_detection`. `deleteHistoryItem()` juga tidak menyentuh latest.
Akibatnya record yang sudah dihapus bisa muncul lagi setelah reload.

- **Perbaikan:** hapus/ubah `LATEST_STORAGE_KEY` saat clear all atau saat item
  yang dihapus adalah record terbaru.

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

### 3.6 `predictTomato` tanpa timeout

`frontend/src/lib/api.ts` memanggil `fetch` tanpa `AbortController`. Kalau backend
menerima koneksi tetapi macet saat inferensi, spinner "Memproses dengan AI..."
bisa berputar tanpa batas.

- **Perbaikan:** timeout 15–30 detik + pesan error yang bisa ditindaklanjuti.

### 3.7 CORS hanya mengizinkan `localhost:3000`

`backend/app/core/config.py` default `CORS_ORIGINS = ["http://localhost:3000"]`.
Membuka `http://127.0.0.1:3000`, atau Next pindah ke port 3001 karena 3000 sibuk,
membuat request diblokir CORS lalu jatuh ke fallback heuristik tanpa penjelasan.

- **Perbaikan:** tambahkan origin `127.0.0.1:3000`, dokumentasikan port, atau
  tampilkan status API di UI.

### 3.8 Responsif navbar dan tombol sampel

Navbar menampilkan logo + 4 link tanpa menu hamburger; pada layar 320–360 px
berpotensi sesak/overflow. Di halaman Hasil, baris tombol sampel memakai
`flex items-center gap-2` tanpa `flex-wrap`, sehingga bisa melebar di HP kecil.

- **Perbaikan:** hamburger/drawer untuk mobile, tambahkan `flex-wrap`, dan uji di
  lebar 320/360/390 px.

### 3.9 Aksesibilitas

- Teks 11–12 px berwarna `text-neutral-400` di atas putih kontrasnya rendah.
- Tombol hapus ikon di `HistoryList` hanya punya `title`, belum `aria-label`.
- Baris riwayat bisa diklik tetapi berupa `<div>` tanpa `role`/`tabIndex`/keyboard
  handler.
- Loading dan error belum memakai `aria-live`.

**Perbaikan:** naikkan kontras, tambahkan label aksesibel, dan dukung navigasi
keyboard.

### 3.10 Bar probabilitas 0% tetap tampil 2%

`ProbabilityBar` memakai `Math.max(2, Number(percentage))`, jadi kelas dengan
probabilitas 0% tetap tergambar sebagai bar kecil. Untuk demo ilmiah, ini bisa
disalahartikan sebagai probabilitas nonzero.

- **Perbaikan:** biarkan 0% tetap 0 (atau tampilkan garis penanda), angka teks
  tetap "0.0%".

### 3.11 Alur "Cara Kerja" menyiratkan segmentasi menjadi input model

Halaman Beranda/Tentang menampilkan urutan "Segmentasi objek" lalu "Klasifikasi
MobileNetV2", sehingga terkesan hasil segmentasi yang dikirim ke model. Pipeline
aslinya memakai **citra asli yang di-resize** untuk model; segmentasi hanya
menghasilkan metadata `color_analysis`.

- **Perbaikan:** ubah copy agar eksplisit: "segmentasi untuk analisis warna;
  MobileNetV2 menerima citra asli." Ini penting saat sidang/presentasi.

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
| 11 | Perbaiki `source: "demo"` + clear/delete latest detection | 🟠 | ⏳ Belum |
| 12 | Banner besar untuk hasil heuristik + wording confidence | 🟠 | ⏳ Belum |
| 13 | Samakan allowlist format upload client/server | 🟠 | ⏳ Belum |
| 14 | Ganti sampel sintetis dengan foto asli dataset | 🟠 | ⏳ Belum |
| 15 | Timeout fetch, CORS `127.0.0.1`, responsive navbar/tombol | 🟡 | ⏳ Belum |
| 16 | Aksesibilitas: kontras, `aria-label`, keyboard, `aria-live` | 🟡 | ⏳ Belum |
| 17 | Environment ML: Python 3.12 + `tensorflow==2.18.0` | 🔴 | ⏳ Belum |

### Catatan implementasi (23 Okt 2026)

- `predict.py` menjadi endpoint sync; pembacaan file lewat `file.file.read()`
  (SpooledTemporaryFile) karena `UploadFile.read()` selalu async.
- `hasil/page.tsx` memakai lazy initializer `useState` + `useSyncExternalStore`
  untuk isClient, sehingga tidak ada `setState` di dalam `useEffect`.
- Test regresi ditambah: 503 saat dependency ML absen, 400 file kosong,
  413 kebesaran, segmentasi hijau/kuning.
- Hasil akhir: backend **35 passed, 3 skipped**; frontend **lint 0 masalah,
  typecheck lolos**.
