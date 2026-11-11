import Image from "next/image";
import Link from "next/link";

import Reveal from "@/components/Reveal";

const levels = [
  {
    name: "Mentah",
    dot: "bg-mentah",
    badge: "bg-mentah-bg text-mentah-text border-mentah-border",
    description:
      "Warna dominan hijau pucat atau kekuningan muda. Belum matang untuk dipanen.",
  },
  {
    name: "Setengah Matang",
    dot: "bg-setengah",
    badge: "bg-setengah-bg text-setengah-text border-setengah-border",
    description:
      "Warna campuran hijau dan merah. Sudah bisa dimakan, tetapi belum manis sempurna.",
  },
  {
    name: "Matang",
    dot: "bg-matang",
    badge: "bg-matang-bg text-matang-text border-matang-border",
    description: "Warna dominan merah merata. Siap dipanen dan dikonsumsi.",
  },
];

const steps = [
  {
    step: "1",
    title: "Unggah foto",
    description:
      "Pengguna mengunggah satu foto tomat, atau mengambil langsung dari kamera.",
  },
  {
    step: "2",
    title: "Segmentasi & analisis warna",
    description:
      "Pengolahan citra memisahkan tomat dari latar belakang (HSV, thresholding, masking) untuk analisis warna sekaligus menentukan area objek (ROI).",
  },
  {
    step: "3",
    title: "Klasifikasi",
    description:
      "MobileNetV2 menerima citra sesuai mode input — asli, crop ROI, atau citra masking — lalu menentukan kelas tomat beserta nilai keyakinannya.",
  },
  {
    step: "4",
    title: "Tampil hasil",
    description:
      "Frontend menampilkan kelas terpilih, confidence score, rincian analisis warna HSV, dan visual mask yang dipakai model.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Reveal>
        <section className="rounded-3xl border border-brand-border bg-white px-6 py-10 sm:px-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Image
              src="/logo-tomatoai.png"
              alt="Logo TomatoAI"
              width={88}
              height={88}
              className="h-20 w-20 shrink-0"
              priority
            />
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-brand-primary">
                Prototipe Web
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">
                Klasifikasi Tingkat Kematangan Tomat
              </h1>
              <p className="mt-4 text-base text-neutral-600 sm:text-lg">
                Deteksi apakah sebuah tomat termasuk kategori mentah, setengah
                matang, atau matang menggunakan pengolahan citra dan
                MobileNetV2.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/deteksi"
                  className="inline-block rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-primary-hover"
                >
                  Mulai Deteksi
                </Link>
                <Link
                  href="/performa"
                  className="inline-block rounded-xl border border-brand-border px-5 py-3 font-medium text-brand-text transition-colors hover:bg-neutral-50"
                >
                  Lihat Performa Model
                </Link>
                <Link
                  href="/tentang"
                  className="inline-block rounded-xl border border-brand-border px-5 py-3 font-medium text-brand-text transition-colors hover:bg-neutral-50"
                >
                  Pelajari Sistem
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-brand-text">
            Tiga Tingkat Kematangan
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {levels.map((level) => (
              <section
                key={level.name}
                className="rounded-2xl border border-brand-border bg-white p-6 transition-shadow hover:shadow-sm"
              >
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${level.badge}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${level.dot}`}
                  />
                  {level.name}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {level.description}
                </p>
              </section>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-brand-text">
            Cara Kerja
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {steps.map((item) => (
              <li
                key={item.step}
                className="rounded-2xl border border-brand-border bg-white p-6"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-4 font-semibold text-brand-text">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <section className="mt-16 rounded-2xl border border-brand-border bg-white p-6">
          <h2 className="font-semibold text-brand-text">Batasan Prototipe</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-600">
            <li>
              Dikhususkan untuk tomat yang telah dipetik di atas permukaan polos
              (bukan tomat di pohon).
            </li>
            <li>
              Hasil model bersifat penunjang keputusan dan tidak menggantikan
              penilaian manual.
            </li>
            <li>
              Objek bukan tomat akan ditolak sebagai kelas{" "}
              <em>Bukan Tomat</em> agar tidak dipaksa menjadi hasil kematangan.
            </li>
          </ul>
        </section>
      </Reveal>
    </div>
  );
}
