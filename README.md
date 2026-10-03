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
    ↓
Preprocessing
    ↓
RGB → HSV
    ↓
Thresholding & Segmentation
    ↓
Resize & Normalization
    ↓
MobileNetV2
    ↓
Klasifikasi
    ↓
Mentah / Setengah Matang / Matang
    ↓
Confidence Score
```

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