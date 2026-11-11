/**
 * Utilitas manajemen penyimpanan lokal (localStorage & sessionStorage)
 * untuk menyimpan hasil deteksi terkini dan riwayat deteksi pengguna.
 *
 * Semua data yang dibaca kembali divalidasi bentuknya (bukan `JSON.parse`
 * mentah) supaya data lama/rusak tidak membuat render crash.
 */

import { MATURITY_LEVELS } from "./types";
import type {
  DetectionRecord,
  DetectionSource,
  MaturityLevel,
  PredictionResponse,
  SegmentationImages,
  ShapeMetrics,
} from "./types";

const LATEST_STORAGE_KEY = "tomatoai_latest_detection";
const HISTORY_STORAGE_KEY = "tomatoai_detection_history";
const MAX_HISTORY_ITEMS = 10;
const SOURCES: DetectionSource[] = ["model", "heuristic", "demo"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Hanya terima data URL gambar; selain itu dianggap tidak ada. */
function asDataUrl(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("data:image/") ? value : null;
}

function sanitizeSegmentation(value: unknown): SegmentationImages | null {
  if (!isRecord(value)) return null;

  const mask = asDataUrl(value.mask_png);
  const input = asDataUrl(value.model_input_jpeg);
  const overlay = asDataUrl(value.overlay_jpeg);
  if (!mask && !input && !overlay) return null;

  return {
    mask_png: mask,
    model_input_jpeg: input,
    overlay_jpeg: overlay,
  };
}

function sanitizeShapeMetrics(value: unknown): ShapeMetrics | null {
  if (!isRecord(value)) return null;

  const keys = [
    "area_ratio",
    "circularity",
    "fill_ratio",
    "solidity",
    "aspect_ratio",
  ] as const;

  const metrics = {} as ShapeMetrics;
  for (const key of keys) {
    const number = value[key];
    if (typeof number !== "number" || !Number.isFinite(number)) return null;
    metrics[key] = number;
  }
  return metrics;
}

/** Ubah data tak dikenal menjadi DetectionRecord yang aman, atau null. */
function sanitizeRecord(value: unknown): DetectionRecord | null {
  if (!isRecord(value) || !isRecord(value.result)) return null;

  const result = value.result;
  const label = result.label;
  if (typeof label !== "string" || !MATURITY_LEVELS.includes(label as MaturityLevel)) {
    return null;
  }

  const confidence = result.confidence;
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return null;
  }

  const probabilities = isRecord(result.probabilities)
    ? (result.probabilities as Record<string, number>)
    : {};

  const color_analysis = isRecord(result.color_analysis)
    ? (result.color_analysis as PredictionResponse["color_analysis"])
    : null;

  // Artefak segmentasi ikut disimpan supaya panel "apa yang dilihat model"
  // tetap tampil saat membuka riwayat, bukan hanya pada hasil terbaru.
  const segmentation = sanitizeSegmentation(result.segmentation);
  const shape_metrics = sanitizeShapeMetrics(result.shape_metrics);

  const source =
    typeof value.source === "string" &&
    SOURCES.includes(value.source as DetectionSource)
      ? (value.source as DetectionSource)
      : "model";

  return {
    id: typeof value.id === "string" ? value.id : `det_${Date.now()}`,
    timestamp:
      typeof value.timestamp === "string" ? value.timestamp : new Date().toISOString(),
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : undefined,
    fileName: typeof value.fileName === "string" ? value.fileName : undefined,
    result: {
      label: label as MaturityLevel,
      confidence,
      probabilities: probabilities as PredictionResponse["probabilities"],
      color_analysis,
      segmentation,
      shape_metrics,
      input_mode: typeof result.input_mode === "string" ? result.input_mode : null,
    },
    source,
  };
}

function withoutSegmentation(item: DetectionRecord): DetectionRecord {
  if (!item.result.segmentation) return item;
  return { ...item, result: { ...item.result, segmentation: null } };
}

function withoutImage(item: DetectionRecord): DetectionRecord {
  if (!item.imageUrl) return item;
  return { ...item, imageUrl: undefined };
}

/**
 * Simpan hasil deteksi terbaru dan tambahkan ke riwayat.
 *
 * `source` menandai asal hasil (model backend / heuristic browser / demo)
 * supaya UI bisa menampilkannya dengan jujur — default "model".
 */
export function saveDetectionResult(
  result: PredictionResponse,
  imageUrl?: string,
  fileName?: string,
  source: DetectionSource = "model",
): DetectionRecord {
  const record: DetectionRecord = {
    id: `det_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    imageUrl,
    fileName: fileName || "Foto Tomat",
    result,
    source,
  };

  if (typeof window === "undefined") return record;

  try {
    sessionStorage.setItem(LATEST_STORAGE_KEY, JSON.stringify(record));
    localStorage.setItem(LATEST_STORAGE_KEY, JSON.stringify(record));
  } catch (e) {
    console.warn("Gagal menyimpan hasil terbaru ke storage:", e);
  }

  const existingHistory = getDetectionHistory();
  const updatedHistory = [
    record,
    ...existingHistory.filter((item) => item.id !== record.id),
  ].slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (quotaError) {
    // Kuota penuh: artefak segmentasi (~40 KB per record) dibuang lebih dulu
    // karena foto thumbnail dan hasil teks masih jauh lebih penting.
    console.warn(
      "Kuota storage penuh, menyimpan riwayat dengan data lebih ringkas:",
      quotaError
    );

    const attempts: DetectionRecord[][] = [
      // 1. Buang segmentasi dari record lama, sisakan yang terbaru.
      updatedHistory.map((item, idx) =>
        idx === 0 ? item : withoutSegmentation(item)
      ),
      // 2. Buang segmentasi di semua record + foto di record lama.
      updatedHistory.map((item, idx) =>
        idx === 0 ? withoutSegmentation(item) : withoutImage(withoutSegmentation(item))
      ),
      // 3. Upaya terakhir: hanya hasil teks, tanpa gambar sama sekali.
      updatedHistory.map((item) => withoutImage(withoutSegmentation(item))),
    ];

    for (const attempt of attempts) {
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(attempt));
        return record;
      } catch {
        // coba strategi berikutnya
      }
    }

    console.error("Riwayat deteksi gagal disimpan ke storage: kuota penuh.");
  }

  return record;
}

/** Ambil hasil deteksi terbaru. */
export function getLatestDetection(): DetectionRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw =
      sessionStorage.getItem(LATEST_STORAGE_KEY) ??
      localStorage.getItem(LATEST_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeRecord(JSON.parse(raw));
  } catch (e) {
    console.error("Gagal membaca hasil deteksi terbaru:", e);
    return null;
  }
}

/** Ambil seluruh daftar riwayat deteksi. */
export function getDetectionHistory(): DetectionRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeRecord)
      .filter((item): item is DetectionRecord => item !== null)
      .slice(0, MAX_HISTORY_ITEMS);
  } catch (e) {
    console.error("Gagal membaca riwayat deteksi:", e);
    return [];
  }
}

/** Hapus seluruh riwayat deteksi. */
export function clearDetectionHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    // Latest detection ikut dihapus — kalau tidak, record yang sudah di-
    // clear akan muncul lagi sebagai hasil terbaru setelah reload.
    localStorage.removeItem(LATEST_STORAGE_KEY);
    sessionStorage.removeItem(LATEST_STORAGE_KEY);
  } catch (e) {
    console.error("Gagal menghapus riwayat:", e);
  }
}

/** Hapus satu item dari riwayat. */
export function deleteHistoryItem(id: string): DetectionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const history = getDetectionHistory().filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));

    // Bila item yang dihapus adalah record terbaru, latest juga harus ikut
    // dihapus/diupdate — supaya record terhapus tidak muncul lagi setelah
    // reload (sessionStorage & localStorage).
    const latest = getLatestDetection();
    if (latest?.id === id) {
      const next = history[0];
      if (next) {
        localStorage.setItem(LATEST_STORAGE_KEY, JSON.stringify(next));
        sessionStorage.setItem(LATEST_STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(LATEST_STORAGE_KEY);
        sessionStorage.removeItem(LATEST_STORAGE_KEY);
      }
    }

    return history;
  } catch (e) {
    console.error("Gagal menghapus item riwayat:", e);
    return [];
  }
}

type MockConfig = {
  confidence: number;
  probabilities: PredictionResponse["probabilities"];
  color_analysis: NonNullable<PredictionResponse["color_analysis"]>;
};

/** Contoh data demo realistis untuk pengujian tampilan hasil. */
export function getMockDetection(
  level: MaturityLevel = "matang"
): DetectionRecord {
  const configs: Record<MaturityLevel, MockConfig> = {
    matang: {
      confidence: 0.942,
      probabilities: {
        matang: 0.942,
        setengah_matang: 0.048,
        mentah: 0.01,
        bukan_tomat: 0,
      },
      color_analysis: {
        mean_hue: 12.4, // Hue merah berada di dekat 0-15 / 165-179
        mean_saturation: 198.6,
        mean_value: 175.2,
        object_ratio: 0.42,
      },
    },
    setengah_matang: {
      confidence: 0.885,
      probabilities: {
        matang: 0.082,
        setengah_matang: 0.885,
        mentah: 0.033,
        bukan_tomat: 0,
      },
      color_analysis: {
        mean_hue: 32.8, // Hue kuning/oranye di rentang 25-45
        mean_saturation: 165.1,
        mean_value: 182.4,
        object_ratio: 0.38,
      },
    },
    mentah: {
      confidence: 0.961,
      probabilities: {
        matang: 0.005,
        setengah_matang: 0.034,
        mentah: 0.961,
        bukan_tomat: 0,
      },
      color_analysis: {
        mean_hue: 65.2, // Hue hijau di rentang 50-80
        mean_saturation: 142.3,
        mean_value: 156.8,
        object_ratio: 0.45,
      },
    },
    bukan_tomat: {
      confidence: 0.918,
      probabilities: {
        matang: 0.031,
        setengah_matang: 0.033,
        mentah: 0.018,
        bukan_tomat: 0.918,
      },
      color_analysis: {
        mean_hue: 30.1, // Hue oranye jeruk di rentang 15-35
        mean_saturation: 210.4,
        mean_value: 205.7,
        object_ratio: 0.36,
      },
    },
  };

  const selected = configs[level];

  return {
    id: `mock_${level}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    fileName: `sample_tomat_${level}.jpg`,
    source: "demo",
    result: {
      label: level,
      confidence: selected.confidence,
      probabilities: selected.probabilities,
      color_analysis: selected.color_analysis,
    },
  };
}
