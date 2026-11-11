import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import MaturityBadge from "@/components/MaturityBadge";

export const metadata: Metadata = {
  title: "Tentang",
  description: "Tentang proyek TomatoAI, teknologi, dan tim pengembang Kelompok 3.",
};

const teamMembers = [
  { no: 1, name: "Amelia Dyah Pramesti", nim: "3.34.24.2.03", role: "Tim 1 — Image Processing" },
  { no: 2, name: "Atha Dhiyahul Haq", nim: "3.34.24.2.06", role: "Tim 1 — Image Processing" },
  { no: 3, name: "Fauzan Dimas Prasetyo Junior", nim: "3.34.24.2.10", role: "Tim 3 — Web Deteksi" },
  { no: 4, name: "M. Haikal Zacki Al Awaly", nim: "3.34.24.2.14", role: "Tim 4 — Web Hasil & Info" },
  { no: 5, name: "M. Naufal Arifki", nim: "3.34.24.2.15", role: "Tim 3 — Web Deteksi" },
  { no: 6, name: "Mochamad Faqih Ardiansyah", nim: "3.34.24.2.16", role: "Tim 2 — AI & Backend" },
  { no: 7, name: "Muhammd Syifa' Arkan", nim: "3.34.24.2.19", role: "Tim 4 — Web Hasil & Info" },
  { no: 8, name: "Wika Dwi Aprilia", nim: "3.34.24.2.25", role: "Tim 2 — AI & Backend" },
];

const maturityInfo = [
  {
    level: "mentah",
    features:
      "Warna hijau pekat hingga hijau kekuningan, tekstur keras, kadar asam tinggi.",
    usage:
      "Pengiriman jarak sangat jauh, penyimpanan jangka panjang, atau digoreng/diolah khusus.",
  },
  {
    level: "setengah_matang",
    features:
      "Transisi warna hijau-kuning dengan semburat oranye/merah (breaker / turning stage).",
    usage:
      "Pilihan terbaik untuk distribusi pasar lokal dan siap matang dalam 2-4 hari suhu ruang.",
  },
  {
    level: "matang",
    features:
      "Warna merah merata di seluruh permukaan, tekstur empuk berair, likopen maksimal.",
    usage: "Siap langsung dikonsumsi segar, dibuat jus, saus, atau bumbu masakan.",
  },
];

const techStack = [
  {
    category: "Pengolahan Citra",
    tool: "OpenCV (Python)",
    desc: "Preprocessing, konversi warna RGB ke HSV, thresholding adaptif, operasi morfologi, isolasi kontur tomat, dan analisis statistik rona warna.",
  },
  {
    category: "Deep Learning",
    tool: "MobileNetV2 (TensorFlow/Keras)",
    desc: "Arsitektur Convolutional Neural Network (CNN) ringan dengan transfer learning, menerima input citra 224×224 piksel untuk klasifikasi 3 kelas kematangan plus kelas penolakan bukan_tomat.",
  },
  {
    category: "Backend REST API",
    tool: "FastAPI",
    desc: "API asinkron berkecepatan tinggi dengan validasi Pydantic, dokumentasi Swagger otomatis (/docs), dan integrasi pipeline end-to-end.",
  },
  {
    category: "Frontend Web",
    tool: "Next.js & Tailwind CSS",
    desc: "Antarmuka berbasis React dengan App Router, sistem desain berbasis warna alami tomat, upload foto/kamera, dan visualisasi interaktif.",
  },
];

export default function TentangPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <PageHeader
        title="Tentang TomatoAI"
        description="Prototipe sistem klasifikasi kematangan tomat berbasis Pengolahan Citra dan MobileNetV2."
      />

      {/* Ringkasan Proyek & Batasan */}
      <section className="space-y-4 rounded-2xl border border-brand-border bg-white p-6 shadow-xs sm:p-8">
        <h2 className="text-xl font-bold text-brand-text">
          Gambaran &amp; Tujuan Sistem
        </h2>
        <p className="text-sm leading-relaxed text-neutral-600">
          <strong>TomatoAI</strong> dirancang sebagai solusi penunjang pascapanen
          bagi petani dan pedagang tomat untuk mengidentifikasi tingkat
          kematangan secara objektif dan otomatis. Sistem mengintegrasikan metode
          pengolahan citra konvensional (segmentasi ruang warna HSV) untuk
          ekstraksi fitur warna serta model <em>deep learning</em>{" "}
          <strong>MobileNetV2</strong> untuk mengenali karakteristik visual yang
          kompleks.
        </p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs leading-relaxed text-amber-900">
          <p className="mb-1 font-semibold">
            Batasan Ruang Lingkup Sistem (MVP):
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Post-Harvest Only:</strong> Dikhususkan untuk tomat yang
              telah dipetik di atas meja/wadah dengan latar belakang
              kontras/polos (bukan tomat di atas pohon / on-vine).
            </li>
            <li>
              Pencahayaan foto diasumsikan memadai dan tidak ada bayangan gelap
              ekstrem yang menutupi tomat.
            </li>
            <li>
              Klasifikasi berfokus pada 3 kelas kematangan: <em>Mentah</em>,{" "}
              <em>Setengah Matang</em>, dan <em>Matang</em>, ditambah kelas
              penolakan <em>Bukan Tomat</em> agar buah atau objek lain tidak
              dipaksa jadi hasil kematangan.
            </li>
            <li>
              Hasil model bersifat penunjang keputusan, bukan pengganti
              penilaian manual.
            </li>
          </ul>
        </div>
      </section>

      {/* 3 Tingkat Kematangan */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-brand-text">
          Tiga Tingkat Kematangan
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {maturityInfo.map((item) => (
            <div
              key={item.level}
              className="flex flex-col justify-between rounded-2xl border border-brand-border bg-white p-5 shadow-xs"
            >
              <div>
                <MaturityBadge level={item.level} size="md" />
                <p className="mt-3 text-xs leading-relaxed text-neutral-600">
                  <strong>Ciri Fisik:</strong> {item.features}
                </p>
              </div>
              <div className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                <strong>Rekomendasi:</strong> {item.usage}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Teknologi */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-brand-text">
          Teknologi yang Digunakan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {techStack.map((tech) => (
            <div
              key={tech.tool}
              className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
                {tech.category}
              </span>
              <h3 className="mt-1 text-base font-bold text-neutral-800">
                {tech.tool}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                {tech.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tim Pengembang Kelompok 3 */}
      <section className="space-y-5 rounded-2xl border border-brand-border bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-brand-text">
              Tim Pengembang — Kelompok 3
            </h2>
            <p className="text-xs text-neutral-600">
              Mata Kuliah Rekayasa Kecerdasan Buatan &amp; Pengolahan Citra
              (Kelas IK 3C)
            </p>
          </div>
          <span className="hidden rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary sm:inline-flex">
            8 Anggota
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {teamMembers.map((member) => (
            <div
              key={member.nim}
              className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5 transition-colors hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-semibold text-neutral-800">
                  {member.name}
                </p>
                <p className="mt-0.5 font-mono text-xs text-neutral-600">
                  NIM: {member.nim}
                </p>
              </div>
              <span className="rounded-md border border-neutral-200/60 bg-white px-2 py-1 text-xs font-medium text-neutral-600">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
