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
Foto Tomat
    ├── Preprocessing (resize & normalisasi)
    │         ↓
    │   RGB → HSV → Thresholding & Segmentation → Analisis Warna (metadata)
    │
    └── Citra ASLI yang di-resize 224×224
              ↓
         MobileNetV2
              ↓
         Klasifikasi
              ↓
         Mentah / Setengah Matang / Matang
              ↓
         Confidence Score
```

**Catatan:** segmentasi dipakai untuk **analisis warna (metadata)**, bukan sebagai
input model — MobileNetV2 menerima citra asli sesuai distribusi data training.

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
- **TensorFlow**: 2.21.0 (terpasang & terverifikasi — `pytest` 38 passed)
- **Keras**: 3 (native TF 2.21 format `.keras`)
- **FastAPI**: Backend API
- **Next.js**: Frontend framework

**Catatan:** Library ML (`requirements-ml.txt`) memakai `tensorflow==2.21.0` yang kompatibel dengan Python 3.12-3.14. Training ulang bisa lewat `training_colab.ipynb` (Colab) atau `app/services/model/training.py` — keduanya menghasilkan `backend/models/mobilenetv2_tomat.keras`.

---

## 📦 Hasil Training & Deploy

- **`backend/models/metrics.json`** — hasil evaluasi test set dalam format JSON
  (accuracy, F1, confusion matrix, laporan per kelas). Ditulis otomatis setiap
  `training.py` selesai, atau regenerasi manual tanpa training ulang:
  `python -m scripts.export_metrics`
- **[`DEPLOY.md`](DEPLOY.md)** — panduan deploy langkah demi langkah (backend
  FastAPI + frontend Next.js), checklist verifikasi, dan apa yang perlu/tidak
  perlu ikut ke server. Training **tidak** dijalankan saat deploy.