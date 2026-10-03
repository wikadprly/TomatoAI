# TomatoAI Frontend

Antarmuka web TomatoAI: Beranda, Deteksi, Hasil, dan Tentang.

## Menjalankan

```bash
npm install
npm run dev
```

Buka <http://localhost:3000>

Backend FastAPI harus berjalan di terminal lain pada <http://localhost:8000>.
Base URL backend dibaca dari `NEXT_PUBLIC_API_BASE_URL`. Salin `.env.example`
menjadi `.env.local` bila perlu mengubahnya.

## Script

| Script | Perintah |
| --- | --- |
| Development server | `npm run dev` |
| Build produksi | `npm run build` |
| Jalankan hasil build | `npm run start` |
| Lint (ESLint) | `npm run lint` |
| Cek tipe TypeScript | `npm run typecheck` |

`npm run typecheck` menjalankan `next typegen` lebih dulu karena tipe route
(`LayoutProps`, `PageProps`) dibuat oleh Next.js saat dev atau build.

## Struktur

```
src/
├── app/          # App Router: setiap folder adalah satu route
├── components/   # Komponen UI yang dipakai ulang
└── lib/          # Client API dan tipe TypeScript
```

### Route

| Route | Isi |
| --- | --- |
| `/` | Hero, penjelasan tiga tingkat kematangan, alur kerja |
| `/deteksi` | Area unggah foto tomat |
| `/hasil` | Tempat menampilkan hasil klasifikasi |
| `/tentang` | Informasi proyek dan pembagian tim |

### Komponen

| Komponen | Tipe | Fungsi |
| --- | --- | --- |
| `Navbar.tsx` | Server | Header dan logo, merangkai `NavLinks` |
| `NavLinks.tsx` | Client | Menu navigasi, menandai menu aktif sesuai URL |
| `Footer.tsx` | Server | Footer |
| `PageHeader.tsx` | Server | Judul dan deskripsi yang konsisten di semua halaman |
| `InfoCard.tsx` | Server | Kartu berisi daftar poin |
| `ImageDropzone.tsx` | Server | Area unggah foto, masih kosong |

### Lib

| File | Fungsi |
| --- | --- |
| `api.ts` | `getHealth()` dan `predictTomato(file)` |
| `types.ts` | Tipe `PredictionResponse`, `HealthResponse`, `ColorAnalysis` |

Tipe di `types.ts` sengaja memakai nama snake_case yang sama dengan backend
(`backend/app/schemas/prediction.py`) supaya tidak perlu kode pengubah format.

## Catatan untuk Tim 3 dan 4

Bagian yang masih kosong dan perlu dikerjakan:

1. `ImageDropzone.tsx` - tambahkan `input` file, pratinjau gambar, dan tombol
   kirim yang memanggil `predictTomato()` dari `src/lib/api.ts`.
2. `src/app/hasil/page.tsx` - tampilkan `label`, `confidence`, `probabilities`,
   dan `color_analysis` dari hasil prediksi.
3. Tambahkan upload dari kamera memakai `getUserMedia` bawaan browser.
4. Pastikan tampilan rapi di layar ponsel. Sudah dipakai prefiks `sm:` di
   beberapa halaman, lanjutkan ke halaman yang belum.

Jangan menambah library UI atau state management baru. Semua kebutuhan saat ini
bisa dipenuhi oleh bawaan Next.js, React, dan Tailwind CSS.