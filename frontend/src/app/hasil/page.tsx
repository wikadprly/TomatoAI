import type { Metadata } from "next";
import Link from "next/link";

import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Hasil",
  description: "Hasil klasifikasi tingkat kematangan tomat.",
};

export default function HasilPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title="Hasil Klasifikasi"
        description="Menampilkan kelas tomat beserta confidence score dari model."
      />

      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="font-medium">Belum ada hasil deteksi</p>
        <p className="mt-2 text-sm text-neutral-500">
          Jalankan deteksi dari halaman Deteksi untuk melihat hasil di sini.
        </p>
        <Link
          href="/deteksi"
          className="mt-6 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Ke Halaman Deteksi
        </Link>
      </div>

      <p className="mt-6 text-sm text-neutral-500">
        TODO (Tim 3 &amp; 4): tampilkan label, confidence score, dan ringkasan
        analisis warna dari backend.
      </p>
    </div>
  );
}