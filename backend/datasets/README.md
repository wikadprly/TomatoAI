# Dataset Tomat

Folder ini tempat meletakkan dataset tomat. Isinya **tidak** di-commit ke Git
karena ukurannya besar. Lihat `.gitignore`.

## Alur kerja (download -> bersih -> split)

Semua perintah dijalankan dari folder `backend/`:

```bash
# 1. Unduh dataset dari Kaggle ke datasets/raw/
#    (prasyarat: pip install kaggle + token ~/.kaggle/kaggle.json,
#     lihat panduan di scripts/download_dataset.py)
python -m scripts.download_dataset <username/slug-dataset>

# 2. Bersihkan: buang corrupt/duplikat, petakan nama folder sumber
#    ke kelas kanonik, samakan semua citra jadi RGB JPEG
#    -> datasets/clean/<kelas>/  (corrupt -> datasets/quarantine/)
python -m scripts.clean_dataset

# 3. Bagi stratified 70:15:15 (keputusan tim) ke train/val/test
python -m scripts.split_dataset
#    rasio lain: python -m scripts.split_dataset --ratios 0.8 0.1 0.1
```

Foto sendiri dari kamera HP cukup ditaruh di `datasets/raw/<nama_kelas>/`
lalu ikut langkah 2-3 seperti biasa.

## Kriteria memilih dataset Kaggle

- Berisi citra buah tomat dengan label tingkat kematangan (minimal 3 tahap,
  atau nama label yang bisa dipetakan: green/unripe, breaker/turning/half
  ripe, red/ripe/fully ripened).
- Lisensi jelas dan mengizinkan penggunaan penelitian/pendidikan.
- Idealnya >= 500-1000 citra per kelas; seimbang antar kelas.
- Cari kandidat dengan: `kaggle datasets list -s "tomato ripeness"`.

Pemetaan nama folder sumber -> kelas kanonik ada di
`scripts/clean_dataset.py` (`DEFAULT_CLASS_ALIASES`); tambahkan alias baru di
sana bila dataset yang dipakai punya penamaan lain.

## Struktur folder

```
datasets/
├── raw/            # hasil unduhan/foto mentah (input langkah 2)
├── clean/          # hasil pembersihan (input langkah 3)
├── quarantine/     # berkas corrupt untuk diperiksa manual
├── train/
│   ├── mentah/
│   ├── setengah_matang/
│   └── matang/
├── val/
│   ├── mentah/
│   ├── setengah_matang/
│   └── matang/
└── test/
    ├── mentah/
    ├── setengah_matang/
    └── matang/
```

Nama folder kelas **harus sama** dengan `CLASS_NAMES` di
`app/core/config.py`: `mentah`, `setengah_matang`, `matang`.

## Dataset yang dipakai

**TomatoCare: Tomato Maturity Image Dataset**
(`sinchanashivanand/tomatocare-tomato-maturity-image-dataset`)
- Lisensi: **CC0-1.0** (bebas dipakai, termasuk penelitian)
- 4.500 citra, seimbang: 900 per tahap (630 train + 135 val + 135 test
  pada dataset asli)
- 5 tahap kematangan USDA: green, breaker, turner, pink, red

### Pemetaan ke 3 kelas proyek (keputusan tim)

| Kelas proyek | Tahap USDA | Jumlah (setelah dedup) |
| --- | --- | --- |
| `mentah` | green | 899 |
| `setengah_matang` | breaker + turner + pink | 2693 |
| `matang` | red | 899 |

Distribusi ~1:3:1 (tidak seimbang) sengaja dipertahankan karena
pemetaan ini paling benar secara agronomi; ketidakseimbangannya
ditutupi dengan **class weighting** saat training.

Alternatif pemetaan seimbang (~1:2:2): `mentah`=green,
`setengah_matang`=breaker+turner, `matang`=pink+red. Untuk
menukarnya: pindahkan `"pink"` dari `setengah_matang` ke `matang`
di `DEFAULT_CLASS_ALIASES` (`scripts/clean_dataset.py`), lalu
jalankan ulang `clean_dataset` dan `split_dataset` (~30 detik).

Catatan: 9 citra ditemukan byte-identik lintas kelas (foto tomat
ambang batas yang dilabel dua tahap sekaligus) dan dibuang oleh
dedup MD5 — sengaja dihilangkan supaya tidak ada citra yang sama
muncul di dua kelas.

## Scope Kamera (Keputusan Tim)

**POST-HARVEST ONLY (MVP)**

- **Target**: Tomat yang **sudah dipetik** — di tangan, keranjang, meja, konveyor
- **Bukan**: Tomat yang masih di pohon (on-vine)
- **Alasan**:
  - Background bersih (tangan, keranjang, meja polos) → segmentasi HSV sederhana cukup
  - Pencahayaan relatif konsisten (indoor/outdoor terang)
  - Minimal oklusi (daun/branch menutupi)
  - Orientasi tomat relatif seragam
  - Dataset TomatoCare sudah post-harvest (background bersih)

**On-vine (di pohon) → Versi 2.0 nanti**
- Butuh dataset tambahan: daun, bayangan, oklusi, jarak jauh
- Butuh segmentasi canggih (deteksi objek + masking instance)
- Timeline & scope terpisah

---

## Foto Kamera HP User (Panduan)

Ketika ambil foto sendiri untuk tambah dataset:
1. **Ambil tomat yang sudah dipetik**
2. **Taruh di background polos** (kertas putih, meja bersih, keranjang)
3. **Cahaya cukup** (hindari bayangan tajam, gunakan flash kalau perlu)
4. **Foto dekat** (tomat memenuhi ~50-70% frame)
5. **Simpan ke** `datasets/raw/<kelas>/` → jalankan `clean_dataset` & `split_dataset`

---

## Aspek legalitas data

- Prefer memakai dataset publik yang lisensinya jelas untuk penelitian.
- Kalau memakai foto sendiri, pastikan ada izin pemilik foto.
- Sertakan sumber dataset di laporan proyek.
