"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Transisi masuk antar halaman.
 *
 * Kunci `pathname` membuat komponen ini di-mount ulang setiap pindah route,
 * sehingga animasi fade+slide berjalan konsisten untuk semua halaman.
 * Tidak memakai AnimatePresence: konten lama dibiarkan hilang seketika agar
 * tidak ada jeda saat menekan tautan.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
