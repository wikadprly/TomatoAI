"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Jeda sebelum animasi mulai (detik) — untuk efek bertahap. */
  delay?: number;
  /** Jarak geser awal dalam piksel. */
  y?: number;
  className?: string;
}

/**
 * Munculkan konten saat masuk viewport, sekali saja.
 *
 * Dipakai untuk section landing page agar halaman terasa hidup saat
 * di-scroll, tanpa perlu memasang intersection observer manual.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
