import Link from "next/link";

import NavLinks from "./NavLinks";

export default function Navbar() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-bold text-red-600">
          TomatoAI
        </Link>
        <NavLinks />
      </nav>
    </header>
  );
}