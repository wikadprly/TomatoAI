import type { Metadata } from "next";

import InfoCard from "@/components/InfoCard";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Tentang",
  description: "Tentang proyek TomatoAI dan pembagian kerja tim.",
};

const technology = [
  "Next.js dengan App Router",
  "TypeScript",
  "Tailwind CSS",
  "Python dengan FastAPI",
  "OpenCV untuk pengolahan citra",
  "TensorFlow/Keras untuk MobileNetV2",
];

const assignments = [
  "Tim 1: preprocessing, RGB ke HSV, thresholding, masking, morphology, segmentasi objek tomat, analisis warna.",
  "Tim 2: dataset, training/fine-tuning MobileNetV2, klasifikasi tiga kelas, evaluasi, prediksi, confidence score.",
  "Tim 3 dan 4: frontend Next.js, UI, upload atau kamera, tampilan hasil klasifikasi, responsive design.",
];

export default function TentangPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title="Tentang TomatoAI"
        description="Web prototype untuk klasifikasi tingkat kematangan tomat menggunakan pengolahan citra dan MobileNetV2."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard title="Teknologi" items={technology} />
        <InfoCard title="Pembagian Kerja" items={assignments} />
      </div>

      <div className="mt-8">
        <InfoCard
          title="Catatan Proyek"
          items={[
            "Backend sudah memiliki endpoint /api/v1/health dan /api/v1/predict.",
            "Endpoint predict mengembalikan 503 sampai bobot MobileNetV2 tersedia.",
            "Bagian pengolahan citra dan model masih kosong dan akan diisi oleh Tim 1 dan Tim 2.",
            "Frontend belum memakai database, authentication, atau dashboard admin.",
          ]}
        />
      </div>
    </div>
  );
}