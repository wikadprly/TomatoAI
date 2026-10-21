import React from "react";
import type { ColorAnalysis } from "@/lib/types";

interface ColorAnalysisCardProps {
  analysis: ColorAnalysis | null;
}

export default function ColorAnalysisCard({ analysis }: ColorAnalysisCardProps) {
  if (!analysis) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
        <p className="font-medium text-neutral-700">Analisis Warna HSV</p>
        <p className="mt-1 text-xs text-neutral-400">
          Metadata analisis warna tidak tersedia untuk deteksi ini (segmentasi tidak menemukan kontur objek terpisah).
        </p>
      </div>
    );
  }

  // Hue di OpenCV adalah 0-179. Ubah ke derajat 0-360 untuk visualisasi warna HSL.
  const hueDeg = analysis.mean_hue !== null ? Math.round(analysis.mean_hue * 2) : 0;
  const satPercent = analysis.mean_saturation !== null ? Math.round((analysis.mean_saturation / 255) * 100) : 0;
  const valPercent = analysis.mean_value !== null ? Math.round((analysis.mean_value / 255) * 100) : 0;
  const ratioPercent = analysis.object_ratio !== null ? (analysis.object_ratio * 100).toFixed(1) : "0";

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div>
          <h3 className="font-semibold text-neutral-800">Analisis Warna HSV & Segmentasi</h3>
          <p className="text-xs text-neutral-500">
            Dihitung dari area objek tomat hasil segmentasi OpenCV
          </p>
        </div>
        <span className="inline-flex items-center rounded-md bg-[#3F7D58]/10 px-2 py-1 text-xs font-medium text-[#3F7D58]">
          OpenCV Pipeline
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Hue */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Mean Hue (H)</span>
            <div
              className="h-4 w-4 rounded-full border border-neutral-300 shadow-2xs"
              style={{ backgroundColor: `hsl(${hueDeg}, 85%, 50%)` }}
              title={`Derajat HSL: ${hueDeg}°`}
            />
          </div>
          <div className="mt-2 text-xl font-bold text-neutral-800">
            {analysis.mean_hue !== null ? analysis.mean_hue.toFixed(1) : "-"}
            <span className="ml-1 text-xs font-normal text-neutral-400">/179</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {analysis.mean_hue !== null && analysis.mean_hue < 20
              ? "Dominan Merah"
              : analysis.mean_hue !== null && analysis.mean_hue < 45
              ? "Jingga / Kuning"
              : "Dominan Hijau"}
          </p>
        </div>

        {/* Saturation */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5">
          <span className="text-xs font-medium text-neutral-500">Saturasi (S)</span>
          <div className="mt-2 text-xl font-bold text-neutral-800">
            {analysis.mean_saturation !== null ? analysis.mean_saturation.toFixed(0) : "-"}
            <span className="ml-1 text-xs font-normal text-neutral-400">/255</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-[#E85D4A]"
              style={{ width: `${satPercent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">{satPercent}% kepekatan</p>
        </div>

        {/* Value / Brightness */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5">
          <span className="text-xs font-medium text-neutral-500">Intensitas (V)</span>
          <div className="mt-2 text-xl font-bold text-neutral-800">
            {analysis.mean_value !== null ? analysis.mean_value.toFixed(0) : "-"}
            <span className="ml-1 text-xs font-normal text-neutral-400">/255</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-[#F2C94C]"
              style={{ width: `${valPercent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">{valPercent}% kecerahan</p>
        </div>

        {/* Object Area Ratio */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5">
          <span className="text-xs font-medium text-neutral-500">Rasio Tomat</span>
          <div className="mt-2 text-xl font-bold text-neutral-800">
            {ratioPercent}%
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-[#3F7D58]"
              style={{ width: `${Math.min(100, Number(ratioPercent))}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">Luas area objek</p>
        </div>
      </div>
    </div>
  );
}
