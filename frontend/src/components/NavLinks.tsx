"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/deteksi", label: "Deteksi" },
  { href: "/hasil", label: "Hasil" },
  { href: "/tentang", label: "Tentang" },
] as const;

/** Menu navigasi. Client Component karena butuh `usePathname`. */
export default function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-4 text-sm sm:gap-6">
      {links.map((link) => {
        const isActive = pathname === link.href;

        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "font-semibold text-red-600"
                  : "text-neutral-600 hover:text-neutral-900"
              }
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}