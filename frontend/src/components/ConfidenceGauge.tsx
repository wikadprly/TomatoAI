"use client";

import { motion, useReducedMotion } from "motion/react";
import { getClassMeta } from "@/lib/maturity";
import AnimatedNumber from "./AnimatedNumber";

interface ConfidenceGaugeProps {
  /** Keyakinan model 0..1. */
  value: number;
  /** Label kelas untuk memilih warna busur. */
  level: string;
  /** Keterangan kecil di bawah angka. */
  caption?: string;
  size?: number;
}

const STROKE = 10;

/**
 * Gauge setengah lingkaran untuk confidence score.
 *
 * Busur dianimasikan dari 0 ke nilai akhir saat komponen muncul, dan angkanya
 * ikut berhitung naik — memberi kesan "hasil sedang dihitung", bukan teks
 * yang tiba-tiba muncul.
 */
export default function ConfidenceGauge({
  value,
  level,
  caption = "Keyakinan model",
  size = 176,
}: ConfidenceGaugeProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  // Hanya 3/4 lingkaran yang dipakai agar terlihat seperti gauge.
  const arc = circumference * 0.75;
  const offset = arc * (1 - clamped);

  const meta = getClassMeta(level);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${caption}: ${(clamped * 100).toFixed(1)} persen`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-[135deg]"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          className="stroke-neutral-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          initial={reduceMotion ? false : { strokeDashoffset: arc }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className={meta.strokeClass}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedNumber
          value={clamped * 100}
          decimals={1}
          suffix="%"
          duration={1.1}
          className="text-2xl font-extrabold tabular-nums tracking-tight text-brand-text"
        />
        <span className="mt-0.5 max-w-24 text-center text-[11px] leading-tight text-neutral-600">
          {caption}
        </span>
      </div>
    </div>
  );
}
