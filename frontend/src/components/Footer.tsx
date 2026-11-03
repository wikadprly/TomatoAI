import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-neutral-500">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-tomatoai.png"
            alt="Logo TomatoAI"
            width={24}
            height={24}
            className="h-6 w-6"
          />
          <p className="font-medium text-neutral-700">TomatoAI</p>
        </div>
        <p className="mt-1">
          Klasifikasi Tingkat Kematangan Tomat Menggunakan Pengolahan Citra dan
          MobileNetV2.
        </p>
      </div>
    </footer>
  );
}