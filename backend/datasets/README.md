# Dataset Tomat (Tim 2)

Folder ini tempat meletakkan dataset tomat. Isinya **tidak** di-commit ke Git
karena ukurannya besar. Lihat `.gitignore`.

Struktur yang diharapkan backend (`app/services/model/dataset.py`):

```
datasets/
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

Nama folder **harus sama** dengan `CLASS_NAMES` di `app/core/config.py`:
`mentah`, `setengah_matang`, `matang`.

Bagi dataset secara manual (70% train, 15% val, 15% test) supaya tidak ada
citra yang sama muncul di dua folder berbeda.

## Aspek legalitas data

- Prefer memakai dataset publik yang lisensinya jelas untuk penelitian.
- Kalau memakai foto sendiri, pastikan ada izin pemilik foto.
- Sertakan sumber dataset di laporan proyek.