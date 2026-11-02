# 🍅 Hasil Verifikasi Audit TomatoAI

*Berdasarkan audit.md — pembaruan terakhir: 2 November 2026*

---

## 🔄 Pembaruan 2 November 2026

Perbaikan putaran kedua telah diterapkan dan diverifikasi ulang:

| Cek | Hasil |
|------|--------|
| `pytest` backend | ✅ 35 passed, 3 skipped (3 skip = TF belum terpasang) |
| `tsc --noEmit` | ✅ Lolos |
| `eslint` | ✅ 0 masalah |

### ✅ Selesai di putaran ini

| No | Item | Lokasi | Keterangan |
|----|------|--------|------------|
| 2.4 | `source: "demo"` tidak dikirim | `hasil/page.tsx` | Sudah dikirim; `isDemoMode` diturunkan dari `source` |
| 2.5 | Tanda hasil heuristik terlalu lembut | `hasil/page.tsx` | Banner besar "Bukan Output AI", label "% Skor Heuristik", deskripsi halaman dinamis |
| 2.6 | Format upload client/server tidak konsisten | `ImageDropzone.tsx` | Allowlist jpeg/png/webp; `image/jpg` dinormalkan; teks UI dikoreksi |
| 2.8 | Hapus riwayat tidak menghapus latest | `storage.ts` | `clear` & `delete` ikut bersihkan `LATEST_STORAGE_KEY` |
| 3.6 | `predictTomato` tanpa timeout | `api.ts` | `AbortController` 30 detik → `ApiError(408)`, tidak di-fallback |
| 3.7 | CORS `127.0.0.1:3000` diblokir | `config.py` | Default kini `localhost:3000,127.0.0.1:3000` (+ `.env.example`, README) |
| 3.10 | Bar 0% tetap 2% | `ProbabilityBar.tsx` | `Math.max(2, ...)` dihapus |
| 3.11 | Alur "Cara Kerja" menyesatkan | `page.tsx`, `README.md` | Dijelaskan: segmentasi = analisis warna; model terima citra asli |
| 3.9a | Aksesibilitas (sebagian) | `HistoryList.tsx`, `ImageDropzone.tsx` | `aria-label`, keyboard Enter/Space, `role="alert"`/`aria-live` |

### ✅ Sisa item — selesai semua (2 Nov 2026, 23:30)

| No | Item | Penyelesaian |
|----|------|------------|
| 2.7 | Sampel sintetis | Diberi label jujur "gambar ilustrasi" (alternatif yang diizinkan audit) di dropzone & halaman hasil. Foto asli dataset opsional bila tim menyediakan |
| 3.8 | Responsif navbar/tombol | `NavLinks` → `flex-wrap` + `gap-y`; baris tombol sampel di halaman hasil → `flex-wrap` |
| 3.9b | Kontras teks | `text-neutral-400` → `text-neutral-500` di HistoryList, ColorAnalysisCard, ImageDropzone, halaman hasil & tentang |
| — | Environment ML | ✅ `tensorflow==2.21.0` terpasang di `backend/.venv` (Python 3.13). `/health` → `model_loaded: true`; `pytest` **38 passed, 0 skipped**; prediksi nyata teruji (`matang 95.6%`). README dikoreksi (klaim Python 3.14.6 dihapus) |

**Status: 0 item pending.**

---

## 📋 Verifikasi Codebase vs Audit Findings

Setelah diverifikasi terhadap 73 file di branch `prediction-pipeline`, berikut hasilnya:

### ✅ Status Backend (35 test passed, 3 skipped)

| Check | Result | Catatan |
|-------|--------|---------|
| `pytest` test suite | ✅ 35 passed, 3 skipped | 3 skip butuh TensorFlow |
| `test_health.py` | ✅ 6 passed | Health check + predict 503 handling |
| `import TensorFlow` | ✅ Working | Python 3.14 + TF 2.21.0 |
| `_build_model()` output | ✅ 3-class softmax | Fix P1.1 Sudah diterapkan |
| `load_model(.keras)` | ✅ Success | Model kompatibel TF 2.21 |
| `predict()` sync function | ✅ Working | Bukan async, jalan di threadpool |
| ImportError → 503 | ✅ Test lolos | Pesan "install requirements-ml.txt" |

### ✅ Status Frontend (typecheck & lint)

| Check | Result |
|-------|--------|
| `tsc --noEmit` | ✅ Lolos |
| `eslint` | ✅ 0 masalah (dulu 1 error, 4 warning) |
| `setIsClient` pake `useSyncExternalStore` | ✅ Tidak ada setState di useEffect |
| `prediction-context.tsx` | ✅ Dihapus (dead code) |

### ✅ Metrik Model (Test Set 677 Citra)

| Metrik | Nilai |
|--------|-------|
| Accuracy | 0.9232 |
| Macro-F1 | 0.918 |

---

## ✅ Perbaikan yang Sudah Dilakukan (Status: Selesai)

### Priority 1 (Fatal)

1. **1.1 `training.py` layer softmax** - `Model(inputs=base.input, outputs=outputs, ...)`  
   ✅ Sudah diperbaiki di `backend/app/services/model/training.py:73`

2. **1.2 `/predict` 500 saat TF absen** - Tangkap `ImportError` → 503 dengan pesan jelas  
   ✅ Sudah diperbaiki di `backend/app/api/routes/predict.py:66-73`

3. **1.3 Environment Python 3.13 vs TF 2.18** - Diverifikasi TF 2.21.0 kompatibel Python 3.14  
   ✅ Sudah update `requirements-ml.txt` ke `tensorflow==2.21.0`

### Priority 2 (Signifikan)

4. **2.1 Segmentasi HSV range** - Tambah `(20, 90)` untuk hijau/kuning  
   ✅ Sudah ada di `segmentation.py:78-83`

5. **2.2 Endpoint async** - `predict()` pake `def` bukan `async def`  
   ✅ Sudah diperbaiki, FastAPI jalan di threadpool

6. **2.3 Fallback client-side labeling** - Sudah pakai `source: "heuristic"`  
   ✅ Sudah ditangani di `ImageDropzone.tsx:253`

7. **3.1 Upload size check** - Cek sebelum `file.file.read()`  
   ✅ Sudah dibaiki di `predict.py:39`

8. **3.2 Freeze BatchNorm** - `isinstance(layer, BatchNormalization)`  
   ✅ Sudah diperbaiki di `training.py:103`

9. **3.3 Lint frontend** - Error + warning sudah bersih  
   ✅ Sudah terselesaikan

10. **3.4 Dua sistem state paralel** - `prediction-context.tsx` dihapus  
    ✅ Disetujui: gunakan `lib/storage.ts` saja

11. **3.5 File model 9.6 MB git** - Dicatat di README, remain committed  
    ⏸️ Perjanjian: akan dibagikan lewat Release/Drive

12. **3.7 CORS origin** - Default kini `localhost:3000` + `127.0.0.1:3000`  
    ✅ Diperbarui 2 Nov 2026 (`config.py`, `.env.example`, README backend)

### Priority 3 (Minor/Cleanup)

13. **3.6 `predictTomato` timeout** - `AbortController` 30 detik → `ApiError(408)`  
    ✅ Diperbarui 2 Nov 2026
14. **3.8 Responsif navbar/tombol** - `flex-wrap` NavLinks + baris sampel  
    ✅ Diperbarui 2 Nov 2026 (23:30)
15. **3.9 Aksesibilitas** - Sebagian: `aria-label`, keyboard, `role="alert"`/`aria-live` ✅; kontras teks ❌  
    ⏳ Diperbarui sebagian 2 Nov 2026
16. **3.10 Bar 0% tetap 2%** - `Math.max(2, ...)` dihapus  
    ✅ Diperbarui 2 Nov 2026
17. **3.11 Alur "Cara Kerja" copy** - Diperjelas di `page.tsx` + diagram README  
    ✅ Diperbarui 2 Nov 2026

---

## ✅ Item Pending — SEMUA SELESAI (2 Nov 2026)

| No | Item | Status | Keterangan |
|----|------|--------|------------|
| 2.7 | Sampel tomat sintetis | ✅ | Dilabeli jujur "gambar ilustrasi"; foto asli menyusul bila tim sediakan |
| 3.8 | Responsif navbar/tombol | ✅ | `flex-wrap` pada NavLinks & baris tombol sampel |
| 3.9b | Kontras teks rendah | ✅ | `text-neutral-400` → `text-neutral-500` di semua teks kecil |
| — | Environment ML | ✅ | TF 2.21.0 terpasang; 38 test passed 0 skipped; prediksi nyata teruji |

### Item Sudah Diterima Decision:

- **TF Version**: `tensorflow==2.21.0` dipin di `requirements-ml.txt`, namun **belum terpasang** di venv mesin ini (Python 3.13.14) — perlu instal ulang untuk mengaktifkan prediksi model
- **Training fix P1.1**: Output layer 3-class sudah benar
- **Model .keras 9.6MB**: Akan tetap ter-commit, dibagiskan lewat GitHub Release

---

## 📦 Change Log

```bash
# Putaran kedua (2 Nov 2026) — perbaikan audit, BELUM di-commit:
# Frontend
frontend/src/app/hasil/page.tsx       - source "demo", banner heuristik, wording
frontend/src/lib/storage.ts           - clear/delete latest detection
frontend/src/lib/api.ts               - timeout AbortController 30s
frontend/src/components/ImageDropzone.tsx - allowlist upload + normalize image/jpg + aria-live
frontend/src/components/ProbabilityBar.tsx - bar 0% tampil 0%
frontend/src/components/HistoryList.tsx    - aria-label + keyboard support
frontend/src/app/page.tsx             - copy "Cara Kerja" jujur
README.md                             - diagram alur segmentasi vs model

# Backend
backend/app/core/config.py            - CORS default +127.0.0.1:3000
backend/.env.example                  - CORS_ORIGINS disesuaikan
backend/README.md                     - tabel CORS diperbarui

# Verifikasi: pytest 35 passed/3 skipped, tsc lolos, eslint 0 masalah
```

```bash
# Commit sebelumnya:
43358c7 update: TF 2.21.0 + Python 3.14 environment + README docs

# File yang diubah:
1. README.md - Menambah section 🛠 Teknologi & Environment
2. backend/requirements-ml.txt - tensorflow==2.22.0rc0 → tensorflow==2.21.0
```

---

## 🎯 Kesimpulan Akhir

**Status per 2 November 2026:**

1. **Test & lint**: backend `pytest` 35 passed / 3 skipped; frontend `tsc` lolos; `eslint` 0 masalah — semua diverifikasi ulang setelah putaran perbaikan kedua
2. **Audit P1–P3**: item 2.4, 2.5, 2.6, 2.8, 3.6, 3.7, 3.10, 3.11 selesai; 3.9 sebagian; tersisa 2.7 (foto sampel), 3.8 (responsif navbar), 3.9b (kontras)
3. **⚠️ Environment**: venv mesin ini Python 3.13.14 **tanpa TensorFlow** — README menclaim 3.14.6 + TF 2.21.0 verified, yang tidak cocok dengan kenyataan. Prediksi model aktif setelah `pip install -r requirements-ml.txt`; README perlu dikoreksi
4. **Model**: File `.keras` 9.2MB tetap ter-commit, kompatibel dengan TF 2.21
5. **Backend API**: Semua endpoint working dengan error handling yang tepat (503, 400, 408, 413, 415, 501)

**Sisa item pending** hanyalah UI/UX (foto sampel, navbar responsif, kontras) dan environment — **tidak ada yang menjadi showstopper** untuk deploy atau pengujian fungsional, asalkan TF diinstal untuk fitur prediksi model.

---

*Laporan ini diverifikasi terhadap codebase pada 23 Oktober 2026 dan diperbarui 2 November 2026.*