"use client";

import { motion, useReducedMotion } from "motion/react";
import { CLASS_ORDER, getClassMeta } from "@/lib/maturity";
import type { MaturityLevel } from "@/lib/types";

interface ProbabilityBarProps {
  probabilities: Partial<Record<MaturityLevel, number>>;
  predictedLabel: string;
}

/**
 * Distribusi keyakinan per kelas.
 *
 * Bar tumbuh dari 0 saat pertama dirender (bukan langsung muncul di lebar
 * akhir), dengan jeda bertahap antar kelas supaya urutannya terbaca.
 */
export default function ProbabilityBar({
  probabilities,
  predictedLabel,
}: ProbabilityBarProps) {
  const reduceMotion = useReducedMotion();

  const normalizedPredicted = (predictedLabel || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");

  return (
    <div className="space-y-3.5">
      {CLASS_ORDER.map((cls, index) => {
        const prob = probabilities[cls] ?? 0;
        const percentage = (prob * 100).toFixed(1);
        const meta = getClassMeta(cls);
        const isWinner = cls === normalizedPredicted;

        return (
          <div key={cls} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-medium ${
                  isWinner ? `${meta.textClass} font-semibold` : "text-neutral-700"
                }`}
              >
                {meta.name} {isWinner && "✓"}
              </span>
              <span
                className={`tabular-nums ${
                  isWinner ? "font-bold text-neutral-800" : "text-neutral-600"
                }`}
              >
                {percentage}%
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 p-0.5"
              role="img"
              aria-label={`${meta.name}: ${percentage} persen`}
            >
              <motion.div
                className={`h-full rounded-full ${meta.barClass} ${
                  isWinner ? "opacity-100" : "opacity-40"
                }`}
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${Number(percentage)}%` }}
                transition={{
                  duration: 0.8,
                  delay: 0.1 + index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
