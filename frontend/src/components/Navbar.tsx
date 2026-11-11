import Image from "next/image";
import Link from "next/link";

import NavLinks from "./NavLinks";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-border bg-white/95 backdrop-blur">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-40 focus:rounded-lg focus:bg-brand-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Lewati ke konten utama
      </a>
      <nav className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg text-lg font-bold text-brand-primary"
        >
          <Image
            src="/logo-tomatoai.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9"
            priority
          />
          <span>TomatoAI</span>
        </Link>
        <NavLinks />
      </nav>
    </header>
  );
}
