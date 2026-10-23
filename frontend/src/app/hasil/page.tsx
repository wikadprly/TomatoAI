"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import MaturityBadge, { getMaturityDescription } from "@/components/MaturityBadge";
import ProbabilityBar from "@/components/ProbabilityBar";
import ColorAnalysisCard from "@/components/ColorAnalysisCard";
import HistoryList from "@/components/HistoryList";
import {
  clearDetectionHistory,
  deleteHistoryItem,
  getDetectionHistory,
  getLatestDetection,
  getMockDetection,
  saveDetectionResult,
} from "@/lib/storage";
import type { DetectionRecord, MaturityLevel } from "@/lib/types";

export default function HasilPage() {
  // Data diinisialisasi langsung dari localStorage via lazy initializer
  // (bukan lewat setState di dalam effect — dilarang react-hooks/
  // set-state-in-effect). render awal aman karena diblokir isClient di bawah.
  const [stored] = useState(() => getLatestDetection());
  const [history, setHistory] = useState<DetectionRecord[]>(() =>
    getDetectionHistory()
  );
  const [currentRecord, setCurrentRecord] = useState<DetectionRecord | null>(
    () => stored ?? getMockDetection("matang")
  );

  // True hanya di browser; dipakai untuk menunda render yang membaca
  // localStorage supaya tidak terjadi hydration mismatch dengan HTML server.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // isDemoMode cukup diturunkan dari id record, tidak perlu state tersendiri.
  const isDemoMode = currentRecord?.id.startsWith("mock_") ?? false;

  const handleSelectRecord = (record: DetectionRecord) => {
    setCurrentRecord(record);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteItem = (id: string) => {
    const updated = deleteHistoryItem(id);
    setHistory(updated);
    if (currentRecord?.id === id) {
      setCurrentRecord(updated[0] || getMockDetection("matang"));
    }
  };

  const handleClearAll = () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat deteksi?")) {
      clearDetectionHistory();
      setHistory([]);
      setCurrentRecord(getMockDetection("matang"));
    }
  };

  const handleLoadDemo = (level: MaturityLevel) => {
    const mock = getMockDetection(level);
    saveDetectionResult(mock.result, undefined, mock.fileName);
    setCurrentRecord(mock);
    setHistory(getDetectionHistory());
  };

  if (!isClient) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <PageHeader
          title="Hasil Klasifikasi"
          description="Memuat data klasifikasi tingkat kematangan tomat..."
        />
        <div className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-400">
          Memuat hasil...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Hasil Klasifikasi"
          description="Evaluasi tingkat kematangan berbasis MobileNetV2 dan Pengolahan Citra HSV."
        />
        <div className="flex items-center gap-2">
          <Link
            href="/deteksi"
            className="inline-flex items-center gap-2 rounded-xl bg-[#3F7D58] px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-[#326446] transition-colors"
          >
            <span>📷</span>
            <span>Mulai Deteksi Tomat</span>
          </Link>
        </div>
      </div>

      {/* Demo Notification Banner */}
      {isDemoMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">💡</span>
            <div>
              <p className="font-semibold">Menampilkan Data Sampel Demonstrasi</p>
              <p className="text-amber-800/90 text-[11px] mt-0.5">
                Ini adalah data pratinjau agar Anda dapat melihat tampilan visualisasi lengkap sebelum mengunggah foto asli.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-neutral-500 text-[11px]">Pilih sampel:</span>
            <button
              type="button"
              onClick={() => handleLoadDemo("mentah")}
              className="rounded-md border border-[#D1E7CB] bg-white px-2.5 py-1 font-medium text-[#3F7D58] hover:bg-[#F0F7EE]"
            >
              Mentah
            </button>
            <button
              type="button"
              onClick={() => handleLoadDemo("setengah_matang")}
              className="rounded-md border border-[#FCE8B0] bg-white px-2.5 py-1 font-medium text-[#B88710] hover:bg-[#FEF9EB]"
            >
              1/2 Matang
            </button>
            <button
              type="button"
              onClick={() => handleLoadDemo("matang")}
              className="rounded-md border border-[#F8D2D2] bg-white px-2.5 py-1 font-medium text-[#CB5B5B] hover:bg-[#FDF2F2]"
            >
              Matang
            </button>
          </div>
        </div>
      )}

      {currentRecord && (
        <div className="space-y-6">
          {/* Main Hero Result Card */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-xs">
            <div className="grid gap-6 md:grid-cols-12 md:items-center">
              {/* Image Preview */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="relative w-full aspect-4/3 max-w-sm rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center shadow-inner">
                  {currentRecord.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentRecord.imageUrl}
                      alt={currentRecord.fileName || "Hasil Tomat"}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-6 text-neutral-400">
                      <span className="text-5xl block mb-2">
                        {currentRecord.result.label === "mentah"
                          ? "🍏"
                          : currentRecord.result.label === "setengah_matang"
                          ? "🍊"
                          : "🍅"}
                      </span>
                      <p className="text-xs font-medium text-neutral-500">
                        {currentRecord.fileName || "Foto Deteksi"}
                      </p>
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5">
                    <MaturityBadge level={currentRecord.result.label} size="sm" />
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between w-full max-w-sm text-xs text-neutral-400 px-1">
                  <span className="truncate max-w-[200px]">
                    {currentRecord.fileName || "Foto Tomat"}
                  </span>
                  <span>
                    {new Date(currentRecord.timestamp).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Prediction Summary & Confidence */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Tingkat Kematangan Terdeteksi
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline gap-3">
                    <h2 className="text-3xl font-extrabold capitalize text-neutral-900 tracking-tight">
                      {currentRecord.result.label.replace("_", " ")}
                    </h2>
                    <span className="text-sm font-semibold text-[#3F7D58]">
                      {(currentRecord.result.confidence * 100).toFixed(1)}% Keyakinan
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                    {getMaturityDescription(currentRecord.result.label)}
                  </p>
                </div>

                {/* Probabilities Breakdown */}
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                  <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3">
                    {currentRecord.source === "heuristic"
                      ? "Distribusi Keyakinan — Heuristik Warna (Browser, Offline)"
                      : currentRecord.source === "demo"
                        ? "Distribusi Keyakinan — Data Sampel Demo"
                        : "Distribusi Keyakinan MobileNetV2"}
                  </h4>
                  <ProbabilityBar
                    probabilities={currentRecord.result.probabilities}
                    predictedLabel={currentRecord.result.label}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* HSV Color Analysis Details */}
          <ColorAnalysisCard analysis={currentRecord.result.color_analysis} />

          {/* Quick Demo Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-4 text-xs text-neutral-500">
            <span>Uji coba sampel klasifikasi lainnya:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadDemo("mentah")}
                className="rounded-lg border border-[#D1E7CB] bg-white px-3 py-1.5 font-medium text-[#3F7D58] hover:bg-[#F0F7EE] transition-colors"
              >
                🌱 Sampel Mentah
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemo("setengah_matang")}
                className="rounded-lg border border-[#FCE8B0] bg-white px-3 py-1.5 font-medium text-[#B88710] hover:bg-[#FEF9EB] transition-colors"
              >
                ⚡ Sampel 1/2 Matang
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemo("matang")}
                className="rounded-lg border border-[#F8D2D2] bg-white px-3 py-1.5 font-medium text-[#CB5B5B] hover:bg-[#FDF2F2] transition-colors"
              >
                🍅 Sampel Matang
              </button>
            </div>
          </div>

          {/* History List Section */}
          <HistoryList
            history={history}
            onSelectRecord={handleSelectRecord}
            onDeleteItem={handleDeleteItem}
            onClearAll={handleClearAll}
          />
        </div>
      )}
    </div>
  );
}