/**
 * Area upload foto tomat.
 *
 * Sengaja masih kosong: belum ada state, belum ada panggilan API.
 * Tim 3 & 4 yang mengisi bagian ini.
 */
export default function ImageDropzone() {
  return (
    <div className="rounded-xl border-2 border-dashed border-neutral-300 bg-white p-10 text-center">
      <p className="font-medium">Unggah foto tomat atau ambil dari kamera</p>
      <p className="mt-1 text-sm text-neutral-500">
        Format JPG atau PNG, maksimal 5 MB.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled
          className="rounded-lg bg-neutral-200 px-4 py-2 text-sm text-neutral-500"
        >
          Pilih Foto
        </button>
        <button
          type="button"
          disabled
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-400"
        >
          Ambil dengan Kamera
        </button>
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        TODO (Tim 3 &amp; 4): tambahkan input file, pratinjau gambar, lalu
        panggil `predictTomato` dari `src/lib/api.ts`.
      </p>
    </div>
  );
}