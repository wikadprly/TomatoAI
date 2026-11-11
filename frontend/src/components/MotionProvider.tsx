"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Konfigurasi animasi global.
 *
 * `reducedMotion="user"` membuat seluruh animasi otomatis dinonaktifkan bila
 * sistem operasi pengguna meminta gerak minimal — tanpa perlu cek manual di
 * setiap komponen.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
