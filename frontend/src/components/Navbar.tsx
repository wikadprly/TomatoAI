import Image from "next/image";
import Link from "next/link";

import NavLinks from "./NavLinks";

export default function Navbar() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-red-600"
        >
          <Image
            src="/logo-tomatoai.png"
            alt="Logo TomatoAI"
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