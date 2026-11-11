"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import PageHeader from "@/components/PageHeader";
import MaturityBadge, {
  getMaturityDescription,
} from "@/components/MaturityBadge";
import ProbabilityBar from "@/components/ProbabilityBar";
import ConfidenceGauge from "@/components/ConfidenceGauge";
import ColorAnalysisCard from "@/components/ColorAnalysisCard";
import SegmentationPanel from "@/components/SegmentationPanel";
import HistoryList from "@/components/HistoryList";
import {
  clearDetectionHistory,
  deleteHistoryItem,
  getDetectionHistory,
  getLatestDetection,
  getMockDetection,
  saveDetectionResult,
} from "@/lib/storage";
import { getClassMeta } from "@/lib/maturity";
import type { DetectionRecord, DetectionSource, MaturityLevel } from "@/lib/types";

const demoButtons: { level: MaturityLevel; label: string }[] = [
  { level: "mentah", label: "Mentah" },
  { level: "setengah_matang", label: "1/2 Matang" },
  { level: "matang", label: "Matang" },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function HasilPage() {
  // Data diinisialisasi langsung dari localStorage via lazy initializer
  // (bukan lewat setState di dalam effect). render awal aman karena
  // diblokir isClient di bawah.
  const [currentRecord, setCurrentRecord] = useState<DetectionRecord | null>(
    () => getLatestDetection()
  );
  const [history, setHistory] = useState<DetectionRecord[]>(() =>
    getDetectionHistory()
  );
  const [confirmClear, setConfirmClear] = useState(false);
  const [copied, setCopied] = useState(false);

  const reduceMotion = useReducedMotion();

  // True hanya di browser; dipakai untuk menunda render yang membaca
  // localStorage supaya tidak terjadi hydration mismatch dengan HTML server.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const source: DetectionSource = currentRecord?.source ?? "model";

  const handleSelectRecord = (record: DetectionRecord) => {
    setCurrentRecord(record);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const handleDeleteItem = (id: string) => {
    const updated = deleteHistoryItem(id);
    setHistory(updated);
    if (currentRecord?.id === id) {
      setCurrentRecord(updated[0] ?? null);
    }
  };

  const handleClearAll = () => {
    clearDetectionHistory();
    setHistory([]);
    setCurrentRecord(null);
    setConfirmClear(false);
  };

  const handleLoadDemo = (level: MaturityLevel) => {
    const mock = getMockDetection(level);
    // Argumen keempat "demo" wajib diisi — tanpa itu record yang tersimpan
    // berlabel "model" dan riwayat menampilkan data sampel sebagai hasil AI.
    saveDetectionResult(mock.result, undefined, mock.fileName, "demo");
    setCurrentRecord(mock);
    setHistory(getDetectionHistory());
  };

  const handleCopySummary = async () => {
    if (!currentRecord) return;

    const meta = getClassMeta(currentRecord.result.label);
    const date = new Date(currentRecord.timestamp).toLocaleString("id-ID");
    const summary = [
      `TomatoAI — Hasil Klasifikasi`,
      `Kelas: ${meta.name}`,
      `Keyakinan: ${(currentRecord.result.confidence * 100).toFixed(1)}%`,
      `Sumber: ${source === "model" ? "MobileNetV2" : source === "heuristic" ? "Heuristik warna (bukan AI)" : "Data sampel demo"}`,
      `Waktu: ${date}`,
      `Catatan: hasil ini penunjang keputusan, bukan pengganti penilaian manual.`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!isClient) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <PageHeader
          title="Hasil Klasifikasi"
          description="Memuat data klasifikasi tingkat kematangan tomat..."
        />
        <div className="space-y-3">
          <div className="skeleton-shimmer h-56 rounded-2xl border border-neutral-200 bg-white" />
          <div className="skeleton-shimmer h-40 rounded-2xl border border-neutral-200 bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Hasil Klasifikasi"
          description={
            source === "heuristic"
              ? "Hasil analisis warna heuristik yang dijalankan di browser — MobileNetV2 tidak dijalankan."
              : "Evaluasi tingkat kematangan berbasis MobileNetV2 dan Pengolahan Citra HSV."
          }
        />
        <Link
          href="/deteksi"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          Mulai Deteksi Tomat
        </Link>
      </div>

      {/* Heuristic (offline) Notification Banner */}
      {source === "heuristic" && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-2xs"
        >
          <span aria-hidden="true" className="text-base">
            ⚠
          </span>
          <div>
            <p className="font-semibold">
              Hasil Heuristik Warna (Browser, Offline) — Bukan Output AI
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Anda memilih analisis lokal karena backend MobileNetV2 tidak
              terjangkau. Angka di bawah dihitung dari analisis warna HSV di
              browser Anda.
            </p>
          </div>
        </div>
      )}

      {/* Demo Notification Banner */}
      {source === "demo" && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-2xs sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">Menampilkan Data Sampel Demonstrasi</p>
            <p className="mt-0.5 text-xs text-amber-800">
              Ini bukan hasil model. Data pratinjau ini hanya untuk melihat
              tampilan visualisasi sebelum Anda mengunggah foto asli.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <span className="text-xs text-neutral-600">Ganti sampel:</span>
            {demoButtons.map(({ level, label }) => (
              <button
                key={level}
                type="button"
                onClick={() => handleLoadDemo(level)}
                className="rounded-md border border-amber-200 bg-white px-2.5 py-1 font-medium text-amber-900 transition-colors hover:bg-amber-100"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentRecord ? (
        <motion.div
          key={currentRecord.id}
          variants={containerVariants}
          initial={reduceMotion ? false : "hidden"}
          animate="show"
          className="space-y-6"
        >
          {/* Main Hero Result Card */}
          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xs sm:p-8"
          >
            <div className="grid gap-6 md:grid-cols-12 md:items-center">
              {/* Image Preview */}
              <div className="flex flex-col items-center md:col-span-5">
                <div className="relative flex aspect-4/3 w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-inner">
                  {currentRecord.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentRecord.imageUrl}
                      alt={`Foto deteksi ${currentRecord.fileName || "tomat"}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="p-6 text-center text-neutral-500">
                      <p className="text-xs font-medium">
                        {currentRecord.fileName || "Foto Deteksi"}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Pratinjau gambar tidak tersedia
                      </p>
                    </div>
                  )}
                  <div className="absolute right-2.5 top-2.5">
                    <MaturityBadge level={currentRecord.result.label} size="sm" />
                  </div>
                </div>

                <div className="mt-2.5 flex w-full max-w-sm items-center justify-between px-1 text-xs text-neutral-600">
                  <span className="max-w-[200px] truncate">
                    {currentRecord.fileName || "Foto Tomat"}
                  </span>
                  <span>
                    {new Date(currentRecord.timestamp).toLocaleDateString(
                      "id-ID",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}
                  </span>
                </div>
              </div>

              {/* Prediction Summary & Confidence */}
              <div className="flex flex-col justify-center space-y-4 md:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                      Tingkat Kematangan Terdeteksi
                    </span>

                    <h2 className="mt-1 text-3xl font-extrabold capitalize tracking-tight text-brand-text">
                      {getClassMeta(currentRecord.result.label).name}
                    </h2>

                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">
                      {getMaturityDescription(currentRecord.result.label)}
                    </p>
                  </div>

                  <ConfidenceGauge
                    value={currentRecord.result.confidence}
                    level={currentRecord.result.label}
                    caption={
                      source === "heuristic"
                        ? "Skor heuristik"
                        : source === "demo"
                          ? "Keyakinan (demo)"
                          : "Keyakinan model"
                    }
                    size={148}
                  />
                </div>

                {/* Probabilities Breakdown */}
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    {source === "heuristic"
                      ? "Distribusi Keyakinan — Heuristik Warna (Browser, Offline)"
                      : source === "demo"
                        ? "Distribusi Keyakinan — Data Sampel Demo"
                        : "Distribusi Keyakinan MobileNetV2"}
                  </h3>
                  <ProbabilityBar
                    probabilities={currentRecord.result.probabilities}
                    predictedLabel={currentRecord.result.label}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    {copied ? "Ringkasan tersalin ✓" : "Salin ringkasan"}
                  </button>
                  {currentRecord.imageUrl && (
                    <a
                      href={currentRecord.imageUrl}
                      download={`tomatoai_${currentRecord.result.label}.jpg`}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                      Unduh foto
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Visual segmentasi: apa yang dilihat model */}
          <motion.div variants={itemVariants}>
            <SegmentationPanel
              originalUrl={currentRecord.imageUrl}
              segmentation={currentRecord.result.segmentation}
              shapeMetrics={currentRecord.result.shape_metrics}
              inputMode={currentRecord.result.input_mode}
            />
          </motion.div>

          {/* HSV Color Analysis Details */}
          <motion.div variants={itemVariants}>
            <ColorAnalysisCard analysis={currentRecord.result.color_analysis} />
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-4 text-xs leading-relaxed text-neutral-600"
          >
            Skor keyakinan menunjukkan seberapa yakin model terhadap kelas yang
            dipilih, bukan jaminan tingkat kematangan sebenarnya. Gunakan hasil
            ini sebagai penunjang keputusan.
          </motion.p>

          {/* History List Section */}
          <motion.div variants={itemVariants}>
            <HistoryList
              history={history}
              activeId={currentRecord.id}
              onSelectRecord={handleSelectRecord}
              onDeleteItem={handleDeleteItem}
              onClearAll={() => setConfirmClear(true)}
            />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Empty state: tidak ada hasil sama sekali */}
          <div className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center sm:p-12">
            <div
              aria-hidden="true"
              className="mx-auto flex h-14 w-14 animate-breathe items-center justify-center rounded-full bg-mentah-bg text-2xl"
            >
              🍅
            </div>
            <h2 className="mt-4 text-lg font-semibold text-brand-text">
              Belum ada hasil klasifikasi
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
              Unggah atau ambil foto satu tomat untuk memulai. Hasil dan riwayat
              deteksi akan muncul di halaman ini.
            </p>
            <Link
              href="/deteksi"
              className="mt-6 inline-block rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-primary-hover"
            >
              Mulai Deteksi
            </Link>

            <div className="mt-6 border-t border-neutral-100 pt-5">
              <p className="text-xs text-neutral-600">
                Atau lihat contoh tampilan dengan data sampel (bukan hasil
                model):
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {demoButtons.map(({ level, label }) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleLoadDemo(level)}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                  >
                    Contoh {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <HistoryList
            history={history}
            activeId={null}
            onSelectRecord={handleSelectRecord}
            onDeleteItem={handleDeleteItem}
            onClearAll={() => setConfirmClear(true)}
          />
        </motion.div>
      )}

      {/* Konfirmasi hapus semua (bukan window.confirm) */}
      <AnimatePresence>
        {confirmClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setConfirmClear(false)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-clear-title"
              aria-describedby="confirm-clear-desc"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
            >
              <h2
                id="confirm-clear-title"
                className="text-base font-semibold text-brand-text"
              >
                Hapus seluruh riwayat?
              </h2>
              <p id="confirm-clear-desc" className="mt-2 text-sm text-neutral-600">
                Semua riwayat deteksi yang tersimpan di perangkat ini akan
                dihapus permanen.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-95"
                >
                  Hapus Semua
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
