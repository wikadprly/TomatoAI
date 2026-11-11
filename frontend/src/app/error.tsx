"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Terjadi error pada antarmuka:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-text">
        Terjadi kesalahan
      </h1>
      <p className="mt-3 text-sm text-neutral-600">
        Halaman gagal dimuat. Coba muat ulang, atau kembali ke beranda untuk
        memulai lagi.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          Coba Lagi
        </button>
        <Link
          href="/"
          className="rounded-xl border border-brand-border px-5 py-2.5 text-sm font-medium text-brand-text transition-colors hover:bg-neutral-50"
        >
          Ke Beranda
        </Link>
      </div>
    </div>
  );
}
