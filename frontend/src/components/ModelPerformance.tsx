"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";
import { ApiError, getModelInfo } from "@/lib/api";
import { getClassMeta } from "@/lib/maturity";
import type { ModelInfo } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; info: ModelInfo };

/**
 * Halaman performa model: akurasi, F1, dan confusion matrix dari test set.
 *
 * Semua angka berasal dari `GET /api/v1/model/info` (file metrics.json hasil
 * evaluasi), bukan hardcode — supaya halaman selalu sesuai model yang aktif.
 */
export default function ModelPerformance() {
  const [state, setState] = useState<State>({ status: "loading" });
  // Menaikkan `attempt` memicu pengambilan ulang data (tombol "Coba lagi").
  const [attempt, setAttempt] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;

    getModelInfo()
      .then((info) => {
        if (!cancelled) setState({ status: "ready", info });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : "Tidak dapat memuat metrik model dari server.";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = () => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  };

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="skeleton-shimmer h-24 rounded-2xl border border-neutral-200 bg-white"
            />
          ))}
        </div>
        <div className="skeleton-shimmer h-64 rounded-2xl border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">Metrik model belum bisa dimuat</p>
        <p className="mt-1 text-xs leading-relaxed">{state.message}</p>
        <p className="mt-2 text-xs leading-relaxed text-amber-800">
          Halaman ini membaca angka evaluasi dari backend. Pastikan server API
          berjalan dan file <code>models/metrics.json</code> sudah dihasilkan.
        </p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium transition-colors hover:bg-amber-100"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  const { info } = state;
  const matrixMax = Math.max(1, ...info.confusion_matrix.flat());

  return (
    <div className="space-y-6">
      {/* Ringkasan metrik utama */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Akurasi", value: info.accuracy, hint: "Benar / total data uji" },
          { label: "Precision", value: info.precision, hint: "Ketepatan prediksi positif" },
          { label: "Recall", value: info.recall, hint: "Cakupan kelas yang ditemukan" },
          { label: "F1-Score", value: info.f1, hint: "Harmoni precision & recall" },
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
            className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              {metric.label}
            </p>
            <AnimatedNumber
              value={metric.value * 100}
              decimals={1}
              suffix="%"
              duration={1}
              className="mt-1 block text-3xl font-extrabold tabular-nums text-brand-text"
            />
            <p className="mt-1 text-[11px] text-neutral-500">{metric.hint}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <motion.div
                className="h-full rounded-full bg-brand-primary"
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${metric.value * 100}%` }}
                transition={{ duration: 0.9, delay: 0.15 + index * 0.06, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Konteks evaluasi */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-brand-border bg-white px-5 py-4 text-xs text-neutral-600">
        <span>
          <strong className="font-semibold text-neutral-800">Model:</strong>{" "}
          <code className="font-mono">{info.model_name}</code>
        </span>
        <span>
          <strong className="font-semibold text-neutral-800">Data uji:</strong>{" "}
          {info.test_set_size} gambar
        </span>
        <span>
          <strong className="font-semibold text-neutral-800">Input:</strong>{" "}
          {info.image_size}×{info.image_size} px ({info.input_mode})
        </span>
        {info.generated_at && (
          <span>
            <strong className="font-semibold text-neutral-800">Dievaluasi:</strong>{" "}
            {new Date(info.generated_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Confusion matrix */}
      <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
        <div className="border-b border-neutral-100 pb-3">
          <h2 className="font-semibold text-neutral-800">Confusion Matrix</h2>
          <p className="mt-0.5 text-xs text-neutral-600">
            Baris = kelas sebenarnya, kolom = hasil prediksi model. Angka pada
            diagonal adalah prediksi yang benar.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left font-medium text-neutral-500">
                  Aktual ↓ / Prediksi →
                </th>
                {info.class_names.map((name) => (
                  <th key={name} className="px-2 py-1 font-semibold text-neutral-700">
                    {getClassMeta(name).name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {info.confusion_matrix.map((row, rowIndex) => (
                <tr key={info.class_names[rowIndex] ?? rowIndex}>
                  <th className="px-2 py-1 text-left font-semibold text-neutral-700">
                    {getClassMeta(info.class_names[rowIndex] ?? "").name}
                  </th>
                  {row.map((value, colIndex) => {
                    const isDiagonal = rowIndex === colIndex;
                    const intensity = value / matrixMax;

                    return (
                      <motion.td
                        key={`${rowIndex}-${colIndex}`}
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, delay: (rowIndex * row.length + colIndex) * 0.015 }}
                        style={{
                          backgroundColor: isDiagonal
                            ? `rgba(63, 125, 88, ${0.12 + intensity * 0.6})`
                            : `rgba(203, 91, 91, ${0.04 + intensity * 0.55})`,
                        }}
                        className={`rounded-lg px-2 py-3 font-mono tabular-nums ${
                          intensity > 0.45 ? "font-bold text-white" : "text-neutral-800"
                        }`}
                      >
                        {value}
                      </motion.td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Metrik per kelas */}
      <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
        <div className="border-b border-neutral-100 pb-3">
          <h2 className="font-semibold text-neutral-800">Metrik per Kelas</h2>
          <p className="mt-0.5 text-xs text-neutral-600">
            Precision, recall, dan F1 dihitung dari confusion matrix di atas.
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {info.per_class.map((metric, index) => (
            <div key={metric.label} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-neutral-800">
                  {getClassMeta(metric.label).name}
                  <span className="ml-2 font-normal text-neutral-500">
                    {metric.support} gambar uji
                  </span>
                </span>
                <span className="font-mono tabular-nums text-neutral-600">
                  P {metric.precision.toFixed(3)} · R {metric.recall.toFixed(3)} · F1{" "}
                  {metric.f1.toFixed(3)}
                </span>
              </div>
              <div className="flex gap-1">
                {[
                  { label: "P", value: metric.precision },
                  { label: "R", value: metric.recall },
                  { label: "F1", value: metric.f1 },
                ].map((part) => (
                  <div
                    key={part.label}
                    className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"
                    title={`${part.label}: ${(part.value * 100).toFixed(1)}%`}
                  >
                    <motion.div
                      className="h-full rounded-full bg-brand-primary"
                      initial={reduceMotion ? false : { width: 0 }}
                      whileInView={{ width: `${part.value * 100}%` }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.8,
                        delay: 0.1 + index * 0.05,
                        ease: "easeOut",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-4 text-xs leading-relaxed text-neutral-600">
        Metrik dihitung pada test set yang tidak dipakai saat training. Angka
        tinggi di data uji tidak menjamin akurasi yang sama pada foto dunia
        nyata dengan latar, pencahayaan, dan sudut berbeda.
      </p>
    </div>
  );
}
