import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-brand-border bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-neutral-600">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-2">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-tomatoai.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <p className="font-semibold text-brand-text">TomatoAI</p>
            </div>
            <p className="text-xs leading-relaxed text-neutral-600">
              Prototipe klasifikasi tingkat kematangan tomat menggunakan
              pengolahan citra dan MobileNetV2. Hasil model bersifat penunjang
              keputusan, bukan pengganti penilaian manual.
            </p>
          </div>

          <nav aria-label="Navigasi footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs sm:justify-end">
              <li>
                <Link href="/deteksi" className="hover:text-brand-primary">
                  Deteksi
                </Link>
              </li>
              <li>
                <Link href="/hasil" className="hover:text-brand-primary">
                  Hasil
                </Link>
              </li>
              <li>
                <Link href="/performa" className="hover:text-brand-primary">
                  Performa Model
                </Link>
              </li>
              <li>
                <Link href="/tentang" className="hover:text-brand-primary">
                  Tentang
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-6 border-t border-brand-border pt-4 text-xs text-neutral-500">
          © {new Date().getFullYear()} Kelompok 3 — Rekayasa Kecerdasan Buatan
          &amp; Pengolahan Citra (IK 3C).
        </p>
      </div>
    </footer>
  );
}
