# 🍅 TomatoAI

**Klasifikasi Tingkat Kematangan Tomat Menggunakan Pengolahan Citra dan MobileNetV2**

TomatoAI merupakan prototype aplikasi berbasis web untuk mengklasifikasikan tingkat kematangan tomat menjadi tiga kategori:

- 🍏 Mentah
- 🟡 Setengah Matang
- 🍅 Matang

Sistem menggabungkan pengolahan citra untuk preprocessing dan segmentasi objek tomat dengan **MobileNetV2** untuk klasifikasi tingkat kematangan.

---

## 📌 Project Overview

TomatoAI dikembangkan sebagai implementasi integrasi antara:

- **Pengolahan Citra** → preprocessing, konversi RGB ke HSV, thresholding, masking, dan morphological processing.
- **Artificial Intelligence / Machine Learning** → klasifikasi menggunakan MobileNetV2.
- **Web Development** → antarmuka pengguna dan integrasi API.

### Alur Sistem

```text
[Browser] unggah foto
      │ validasi tipe & ukuran
      ▼
POST /api/v1/predict
      │
      ▼
[Backend] validasi request (400 / 413 / 415)
      │
      ▼
┌─ Pengolahan Citra ───────────────────────────────────┐
│ 1. preprocessing: baca gambar → RGB → resize 224     │
│ 2. segmentasi: RGB → HSV → thresholding              │
│    → masking → morfologi → mask objek tomat          │
│ 3. analisis warna area tomat → color_analysis        │
└──────────────────────────────────────────────────────┘
      │ pilih input model (INFERENCE_INPUT_MODE)
      │   • original : citra 224 asli (default)
      │   • crop     : potong bbox mask + margin → 224
      │   • segment  : citra masking (latar hitam)
      ▼
┌─ AI ─────────────────────────────────────────────────┐
│ 4. MobileNetV2 → probabilitas 3 kelas                │
│ 5. guard khusus tomat (bentuk mask + keyakinan)      │
└──────────────────────────────────────────────────────┘
      │
      ▼
Respons JSON: label, confidence, probabilities, color_analysis
200 = berhasil | 422 = bukan satu tomat | 503 = model belum siap
      │
      ▼
[Frontend] halaman hasil
  • 200 → tampilkan kelas + confidence
  • 422 → pesan penolakan (tanpa fallback heuristik)
  • backend mati → fallback heuristik browser + banner "Bukan Output AI"
```

**Mode input AI.** Default `original` karena MobileNetV2 dilatih pada citra
utuh (dengan background). Hasil pengolahan citra bisa langsung menjadi input
lewat `INFERENCE_INPUT_MODE=crop` (potong area objek dari resolusi penuh) atau
`segment` (citra hasil masking). Sebelum mengganti default, bandingkan dulu
ketiganya pada test set — **tanpa training ulang**:

```bash
cd backend
python -m scripts.evaluate_input_modes --out models/input_mode_comparison.json
```

**Pembagian peran.** Pengolahan citra menangani preprocessing, HSV,
thresholding, morfologi, segmentasi, ROI, dan analisis warna. AI (MobileNetV2)
menangani klasifikasi kematangan. Guard hanya memvalidasi bahwa input memang
satu tomat.

---

## Kelompok 3 — IK 3C

* Amelia Dyah Pramesti
* Atha Dhiyahul Haq
* Fauzan Dimas Prasetyo Junior
* M. Haikal Zacki Al Awaly
* M. Naufal Arifki
* Mochamad Faqih Ardiansyah
* Muhammd Syifa'Arkan
* Wika Dwi Aprilia

---
## 🛠 Teknologi & Environment

- **Python**: 3.13 (venv `backend/.venv`)
- **TensorFlow**: 2.21.0 (terpasang & terverifikasi — `pytest` 54 passed)
- **Keras**: 3 (native TF 2.21 format `.keras`)
- **FastAPI**: Backend API
- **Next.js**: Frontend framework

**Catatan:** Library ML (`requirements-ml.txt`) memakai `tensorflow==2.21.0` yang kompatibel dengan Python 3.10–3.13. Training ulang bisa lewat `training_colab.ipynb` (Colab) atau `app/services/model/training.py` — keduanya menghasilkan `backend/models/mobilenetv2_tomat.keras`.

---

## 📦 Hasil Training & Deploy

- **`backend/models/metrics.json`** — hasil evaluasi test set dalam format JSON
  (accuracy, F1, confusion matrix, laporan per kelas). Ditulis otomatis setiap
  `training.py` selesai, atau regenerasi manual tanpa training ulang:
  `python -m scripts.export_metrics`
- **[`DEPLOY.md`](DEPLOY.md)** — panduan deploy langkah demi langkah (backend
  FastAPI + frontend Next.js), checklist verifikasi, dan apa yang perlu/tidak
  perlu ikut ke server. Training **tidak** dijalankan saat deploy.