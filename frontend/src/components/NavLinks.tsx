"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/deteksi", label: "Deteksi" },
  { href: "/hasil", label: "Hasil" },
  { href: "/performa", label: "Performa" },
  { href: "/tentang", label: "Tentang" },
] as const;

function linkClass(isActive: boolean) {
  return isActive
    ? "font-semibold text-brand-primary"
    : "text-neutral-600 transition-colors hover:text-brand-primary";
}

/** Menu navigasi. Client Component karena butuh `usePathname`. */
export default function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div className="flex items-center gap-2">
        <ul className="hidden items-center gap-x-5 text-sm md:flex">
          {links.map((link) => {
            const isActive = pathname === link.href;

            return (
              <li key={link.href} className="relative">
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative inline-block py-1 ${linkClass(isActive)}`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-underline"
                      className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-brand-primary"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
          className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.ul
            id="mobile-nav"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full z-20 overflow-hidden border-b border-brand-border bg-white px-4 shadow-sm md:hidden"
          >
            <div className="space-y-1 py-3">
              {links.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <li key={link.href} className="list-none">
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-mentah-bg font-semibold text-brand-primary"
                          : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  );
}
