"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Jumlah digit di belakang koma. */
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

/**
 * Angka yang "berhitung naik" saat pertama muncul.
 *
 * Memakai MotionValue langsung sebagai isi elemen, sehingga animasi berjalan
 * di luar siklus render React (tidak memicu re-render tiap frame). Saat
 * pengguna meminta gerak minimal, nilai akhir langsung ditampilkan.
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 0.9,
  className,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(reduceMotion ? value : 0);
  const text = useTransform(
    count,
    (latest) => `${prefix}${latest.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    if (reduceMotion) {
      count.set(value);
      return;
    }

    const controls = animate(count, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => controls.stop();
  }, [value, duration, reduceMotion, count]);

  return <motion.span className={className}>{text}</motion.span>;
}
