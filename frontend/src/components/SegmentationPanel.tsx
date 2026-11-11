"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { SegmentationImages, ShapeMetrics } from "@/lib/types";

interface SegmentationPanelProps {
  /** Foto asli yang diunggah (thumbnail lokal). */
  originalUrl?: string | null;
  segmentation?: SegmentationImages | null;
  shapeMetrics?: ShapeMetrics | null;
  inputMode?: string | null;
}

type TabId = "asli" | "mask" | "input" | "overlay";

const TABS: { id: TabId; label: string; hint: string }[] = [
  {
    id: "asli",
    label: "Foto Asli",
    hint: "Gambar yang Anda unggah, sudah dinormalisasi ke 224×224.",
  },
  {
    id: "mask",
    label: "Mask HSV",
    hint: "Area putih adalah objek yang dipisahkan dari latar belakang memakai threshold HSV + morfologi.",
  },
  {
    id: "input",
    label: "Input Model",
    hint: "Citra persis yang diterima MobileNetV2 setelah tahap segmentasi dan ROI.",
  },
  {
    id: "overlay",
    label: "Kontur",
    hint: "Kontur hijau menandai objek tomat yang terdeteksi pada foto asli.",
  },
];

/**
 * Menampilkan "isi kepala" pipeline pengolahan citra.
 *
 * Ini bagian yang membuktikan sistem benar-benar melakukan segmentasi HSV,
 * bukan sekadar mengirim foto mentah ke CNN. Pengguna bisa berpindah tab
 * dengan animasi crossfade agar perbedaan antar tahap mudah dibandingkan.
 */
export default function SegmentationPanel({
  originalUrl,
  segmentation,
  shapeMetrics,
  inputMode,
}: SegmentationPanelProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<TabId>("overlay");

  const sources: Record<TabId, string | null | undefined> = {
    asli: originalUrl,
    mask: segmentation?.mask_png,
    input: segmentation?.model_input_jpeg,
    overlay: segmentation?.overlay_jpeg,
  };

  // Bila tab yang dipilih tidak punya gambar (mis. hasil heuristik tanpa
  // segmentasi), jatuh ke tab pertama yang tersedia agar panel tidak kosong.
  const resolved: TabId = sources[active]
    ? active
    : (["overlay", "mask", "input", "asli"] as TabId[]).find((id) => sources[id]) ??
      active;

  const current = sources[resolved];
  const activeTab = TABS.find((tab) => tab.id === resolved) ?? TABS[0];

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <h2 className="font-semibold text-neutral-800">
            Pengolahan Citra — Apa yang Dilihat Model
          </h2>
          <p className="mt-0.5 text-xs text-neutral-600">
            Hasil segmentasi OpenCV sebelum klasifikasi MobileNetV2.
          </p>
        </div>
        {inputMode && (
          <span className="inline-flex items-center rounded-md bg-brand-primary/10 px-2 py-1 text-xs font-medium text-brand-primary">
            mode input: {inputMode}
          </span>
        )}
      </div>

      <div
        className="mt-4 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Tahap pengolahan citra"
      >
        {TABS.map((tab) => {
          const disabled = !sources[tab.id];
          const isActive = tab.id === resolved;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              disabled={disabled}
              onClick={() => setActive(tab.id)}
              className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                isActive
                  ? "text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="segmentation-tab"
                  className="absolute inset-0 rounded-lg bg-brand-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${resolved}`}
        role="tabpanel"
        aria-labelledby={`tab-${resolved}`}
        className="relative mt-3 flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-[repeating-conic-gradient(#f5f5f5_0%_25%,#ffffff_0%_50%)] bg-[length:20px_20px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          {current ? (
            <motion.img
              key={resolved}
              src={current}
              alt={activeTab.label}
              initial={reduceMotion ? false : { opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full w-full object-contain"
            />
          ) : (
            <motion.p
              key="empty"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 text-center text-xs text-neutral-500"
            >
              Visual tahap ini tidak tersedia. Jalankan ulang deteksi dengan
              backend aktif untuk melihat hasil segmentasi.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={activeTab.id}
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-3 text-xs leading-relaxed text-neutral-600"
        >
          {activeTab.hint}
        </motion.p>
      </AnimatePresence>

      {shapeMetrics && (
        <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-4 sm:grid-cols-5">
          <MetricChip label="Luas objek" value={shapeMetrics.area_ratio.toFixed(2)} />
          <MetricChip label="Kebulatan" value={shapeMetrics.circularity.toFixed(2)} />
          <MetricChip label="Kepadatan" value={shapeMetrics.fill_ratio.toFixed(2)} />
          <MetricChip label="Soliditas" value={shapeMetrics.solidity.toFixed(2)} />
          <MetricChip label="Aspek" value={shapeMetrics.aspect_ratio.toFixed(2)} />
        </dl>
      )}
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-2.5 py-1.5">
      <dt className="text-[11px] text-neutral-500">{label}</dt>
      <dd className="font-mono text-sm font-semibold tabular-nums text-neutral-800">
        {value}
      </dd>
    </div>
  );
}
