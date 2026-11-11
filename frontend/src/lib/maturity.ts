/**
 * Metadata visual per kelas kematangan.
 *
 * Satu sumber kebenaran untuk nama, warna, dan deskripsi kelas — dipakai
 * bersama oleh MaturityBadge, ProbabilityBar, ConfidenceGauge, dan data sampel
 * demo supaya warna tidak ditulis ulang sebagai hex di banyak komponen.
 */
import type { MaturityLevel } from "./types";

export const CLASS_ORDER: MaturityLevel[] = [
  "mentah",
  "setengah_matang",
  "matang",
  "bukan_tomat",
];

export type ClassMeta = {
  name: string;
  /** Warna solid, dipakai untuk isi bar probabilitas dan titik penanda. */
  barClass: string;
  /** Warna garis SVG, dipakai gauge keyakinan. */
  strokeClass: string;
  /** Warna teks yang kontras di atas putih. */
  textClass: string;
  badgeBgClass: string;
  badgeBorderClass: string;
  description: string;
};

export const CLASS_META: Record<MaturityLevel, ClassMeta> = {
  mentah: {
    name: "Mentah",
    barClass: "bg-mentah",
    strokeClass: "stroke-mentah",
    textClass: "text-mentah-text",
    badgeBgClass: "bg-mentah-bg",
    badgeBorderClass: "border-mentah-border",
    description:
      "Kandungan klorofil dominan tinggi, tekstur padat/keras, belum siap dikonsumsi langsung.",
  },
  setengah_matang: {
    name: "Setengah Matang",
    barClass: "bg-setengah",
    strokeClass: "stroke-setengah",
    textClass: "text-setengah-text",
    badgeBgClass: "bg-setengah-bg",
    badgeBorderClass: "border-setengah-border",
    description:
      "Transisi warna hijau ke kemerahan/oranye, cocok untuk pengiriman jarak jauh atau penyimpanan.",
  },
  matang: {
    name: "Matang",
    barClass: "bg-matang",
    strokeClass: "stroke-matang",
    textClass: "text-matang-text",
    badgeBgClass: "bg-matang-bg",
    badgeBorderClass: "border-matang-border",
    description:
      "Likopen merah berkembang penuh, rasa manis asam seimbang, siap dikonsumsi atau diolah.",
  },
  bukan_tomat: {
    name: "Bukan Tomat",
    barClass: "bg-neutral-400",
    strokeClass: "stroke-neutral-500",
    textClass: "text-neutral-700",
    badgeBgClass: "bg-neutral-100",
    badgeBorderClass: "border-neutral-300",
    description:
      "Objek terdeteksi bukan tomat. Foto mungkin berisi buah lain (jeruk, apel), objek, atau latar belakang — coba unggah foto satu tomat.",
  },
};

/** Normalisasi label dari API ("Setengah Matang", "MATANG") ke kunci metadata. */
export function normalizeLevel(level: string): string {
  return (level || "").toLowerCase().trim().replace(/\s+/g, "_");
}

const UNKNOWN_META: ClassMeta = {
  name: "Tidak Diketahui",
  barClass: "bg-neutral-500",
  strokeClass: "stroke-neutral-500",
  textClass: "text-neutral-600",
  badgeBgClass: "bg-neutral-100",
  badgeBorderClass: "border-neutral-200",
  description: "",
};

/** Metadata kelas dengan fallback netral untuk label yang tidak dikenal. */
export function getClassMeta(level: string): ClassMeta {
  const key = normalizeLevel(level) as MaturityLevel;
  return CLASS_META[key] ?? { ...UNKNOWN_META, name: level || UNKNOWN_META.name };
}
