import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-sm font-semibold text-brand-primary">404</p>
      <h1 className="mt-2 text-2xl font-bold text-brand-text">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-3 text-sm text-neutral-600">
        Alamat yang Anda buka tidak tersedia. Kembali ke beranda atau langsung
        mulai deteksi.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          Ke Beranda
        </Link>
        <Link
          href="/deteksi"
          className="rounded-xl border border-brand-border px-5 py-2.5 text-sm font-medium text-brand-text transition-colors hover:bg-neutral-50"
        >
          Mulai Deteksi
        </Link>
      </div>
    </div>
  );
}
