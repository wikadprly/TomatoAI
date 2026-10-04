# Dataset Tomat (Tim 2)

Folder ini tempat meletakkan dataset tomat. Isinya **tidak** di-commit ke Git
karena ukurannya besar. Lihat `.gitignore`.

## Alur kerja Fase 1 (download -> bersih -> split)

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

## Aspek legalitas data

- Prefer memakai dataset publik yang lisensinya jelas untuk penelitian.
- Kalau memakai foto sendiri, pastikan ada izin pemilik foto.
- Sertakan sumber dataset di laporan proyek.
