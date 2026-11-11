import type { Metadata } from "next";

import ModelPerformance from "@/components/ModelPerformance";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Performa Model",
  description:
    "Akurasi, F1-score, dan confusion matrix MobileNetV2 pada test set TomatoAI.",
};

export default function PerformaPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <PageHeader
        title="Performa Model"
        description="Hasil evaluasi MobileNetV2 pada data uji yang tidak dipakai saat training. Angka diambil langsung dari server, bukan ditulis manual."
      />
      <ModelPerformance />
    </div>
  );
}
