import Link from "next/link";

const levels = [
  {
    name: "Mentah",
    badge: "bg-green-100 text-green-700",
    description:
      "Warna dominan hijau pucat atau kekuningan muda. Belum matang untuk dipanen.",
  },
  {
    name: "Setengah Matang",
    badge: "bg-amber-100 text-amber-700",
    description:
      "Warna campuran hijau dan merah. Sudah bisa dimakan, tetapi belum manis sempurna.",
  },
  {
    name: "Matang",
    badge: "bg-red-100 text-red-700",
    description:
      "Warna dominan merah merata. Siap dipanen dan dikonsumsi.",
  },
];

const steps = [
  {
    step: "1",
    title: "Unggah foto",
    description: "Pengguna mengunggah satu foto tomat, atau mengambil dari kamera.",
  },
  {
    step: "2",
    title: "Segmentasi objek",
    description:
      "Pengolahan citra memisahkan tomat dari latar belakang memakai HSV, thresholding, masking, dan morphology.",
  },
  {
    step: "3",
    title: "Klasifikasi",
    description:
      "MobileNetV2 menentukan kelas tomat beserta nilai keyakinannya.",
  },
  {
    step: "4",
    title: "Tampil hasil",
    description:
      "Frontend menampilkan kelas terpilih beserta confidence score dari model.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-red-600">Prototipe Web</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Klasifikasi Tingkat Kematangan Tomat
        </h1>
        <p className="mt-4 text-lg text-neutral-600">
          Deteksi apakah sebuah tomat termasuk kategori mentah, setengah matang,
          atau matang menggunakan pengolahan citra dan MobileNetV2.
        </p>
        <Link
          href="/deteksi"
          className="mt-8 inline-block rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700"
        >
          Mulai Deteksi
        </Link>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight">
          Tiga Tingkat Kematangan
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {levels.map((level) => (
            <section
              key={level.name}
              className="rounded-xl border border-neutral-200 bg-white p-6"
            >
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${level.badge}`}
              >
                {level.name}
              </span>
              <p className="mt-3 text-sm text-neutral-600">
                {level.description}
              </p>
            </section>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight">Cara Kerja</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {steps.map((item) => (
            <li
              key={item.step}
              className="rounded-xl border border-neutral-200 bg-white p-6"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                {item.step}
              </span>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}