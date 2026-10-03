import type { Metadata } from "next";

import ImageDropzone from "@/components/ImageDropzone";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Deteksi",
  description: "Unggah atau ambil foto tomat untuk diklasifikasikan.",
};

export default function DeteksiPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title="Deteksi Kematangan"
        description="Pilih satu foto tomat. Hasilnya akan muncul di halaman Hasil."
      />
      <ImageDropzone />
    </div>
  );
}