"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { DetectionRecord, DetectionSource } from "@/lib/types";
import MaturityBadge from "./MaturityBadge";

interface HistoryListProps {
  history: DetectionRecord[];
  onSelectRecord: (record: DetectionRecord) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  /** ID record yang sedang ditampilkan, untuk menandai baris aktif. */
  activeId?: string | null;
}

const sourceLabel: Record<DetectionSource, string> = {
  model: "MobileNetV2",
  heuristic: "Heuristik",
  demo: "Demo",
};

const sourceClass: Record<DetectionSource, string> = {
  model: "bg-brand-primary/10 text-brand-primary",
  heuristic: "bg-amber-100 text-amber-800",
  demo: "bg-neutral-100 text-neutral-600",
};

export default function HistoryList({
  history,
  onSelectRecord,
  onDeleteItem,
  onClearAll,
  activeId,
}: HistoryListProps) {
  const reduceMotion = useReducedMotion();

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center text-sm text-neutral-600">
        <p>Belum ada riwayat deteksi yang tersimpan di perangkat ini.</p>
        <p className="mt-1 text-xs text-neutral-600">
          Setiap deteksi yang Anda lakukan akan otomatis tersimpan di sini
          secara lokal.
        </p>
        <Link
          href="/deteksi"
          className="mt-4 inline-block rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          Mulai Deteksi
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-4">
        <div>
          <h3 className="font-semibold text-neutral-800">
            Riwayat Deteksi Terkini
          </h3>
          <p className="text-xs text-neutral-600">
            Tersimpan lokal di browser ({history.length} deteksi)
          </p>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-md px-2 py-1 text-xs font-medium text-brand-red transition-colors hover:bg-red-50"
        >
          Hapus Semua
        </button>
      </div>

      <ul className="mt-4 divide-y divide-neutral-100">
        <AnimatePresence initial={false}>
          {history.map((item) => {
            const dateStr = new Date(item.timestamp).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const source: DetectionSource = item.source ?? "model";
            const isActive = item.id === activeId;

            return (
              <motion.li
                key={item.id}
                layout
                initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: 24, height: 0, marginTop: 0, marginBottom: 0 }
                }
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={`flex items-center gap-3 py-3 ${
                  isActive ? "rounded-lg bg-brand-primary/5 px-2" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectRecord(item)}
                  aria-label={`Buka hasil deteksi ${item.fileName || "Foto Tomat"}`}
                  aria-current={isActive ? "true" : undefined}
                  className="flex min-w-0 flex-1 items-center gap-3.5 rounded-lg text-left focus-visible:bg-neutral-50 -mx-2 px-2 py-1 transition-colors hover:bg-neutral-50"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-500"
                    >
                      N/A
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-neutral-800">
                        {item.fileName || "Foto Tomat"}
                      </span>
                      <MaturityBadge level={item.result.label} size="sm" />
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                      <span>{dateStr}</span>
                      <span aria-hidden="true">•</span>
                      <span>
                        Keyakinan: {(item.result.confidence * 100).toFixed(1)}%
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${sourceClass[source]}`}
                      >
                        {sourceLabel[source]}
                      </span>
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-brand-red"
                  aria-label={`Hapus deteksi ${item.fileName || "Foto Tomat"}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
