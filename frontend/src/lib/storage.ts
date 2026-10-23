/**
 * Utilitas manajemen penyimpanan lokal (localStorage & sessionStorage)
 * untuk menyimpan hasil deteksi terkini dan riwayat deteksi pengguna.
 */

import type {
  DetectionRecord,
  DetectionSource,
  MaturityLevel,
  PredictionResponse,
} from "./types";

const LATEST_STORAGE_KEY = "tomatoai_latest_detection";
const HISTORY_STORAGE_KEY = "tomatoai_detection_history";
const MAX_HISTORY_ITEMS = 10;

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

  if (typeof window !== "undefined") {
    try {
      // 1. Simpan sebagai hasil terbaru di sessionStorage & localStorage
      sessionStorage.setItem(LATEST_STORAGE_KEY, JSON.stringify(record));
      localStorage.setItem(LATEST_STORAGE_KEY, JSON.stringify(record));

      // 2. Tambahkan ke riwayat (maksimal MAX_HISTORY_ITEMS)
      const existingHistory = getDetectionHistory();
      // Bila gambar base64 terlalu besar, kita tetap simpan tetapi jika kuota penuh tangani dengan baik
      const updatedHistory = [record, ...existingHistory.filter((item) => item.id !== record.id)].slice(
        0,
        MAX_HISTORY_ITEMS
      );

      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (quotaError) {
        // Jika kuota localStorage penuh karena data URL gambar, simpan tanpa imageUrl
        console.warn("Storage quota exceeded, saving history without image preview", quotaError);
        const slimHistory = updatedHistory.map((item, idx) =>
          idx === 0 ? item : { ...item, imageUrl: undefined }
        );
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(slimHistory));
      }
    } catch (e) {
      console.error("Gagal menyimpan hasil deteksi ke storage:", e);
    }
  }

  return record;
}

/** Ambil hasil deteksi terbaru. */
export function getLatestDetection(): DetectionRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const sessionData = sessionStorage.getItem(LATEST_STORAGE_KEY);
    if (sessionData) {
      return JSON.parse(sessionData) as DetectionRecord;
    }

    const localData = localStorage.getItem(LATEST_STORAGE_KEY);
    if (localData) {
      return JSON.parse(localData) as DetectionRecord;
    }
  } catch (e) {
    console.error("Gagal membaca hasil deteksi terbaru:", e);
  }

  return null;
}

/** Ambil seluruh daftar riwayat deteksi. */
export function getDetectionHistory(): DetectionRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as DetectionRecord[];
    }
  } catch (e) {
    console.error("Gagal membaca riwayat deteksi:", e);
  }

  return [];
}

/** Hapus seluruh riwayat deteksi. */
export function clearDetectionHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
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
    return history;
  } catch (e) {
    console.error("Gagal menghapus item riwayat:", e);
    return [];
  }
}

/** Contoh data demo realistis untuk pengujian tampilan hasil. */
export function getMockDetection(level: MaturityLevel = "matang"): DetectionRecord {
  const configs: Record<
    MaturityLevel,
    {
      confidence: number;
      probabilities: Record<string, number>;
      color_analysis: {
        mean_hue: number;
        mean_saturation: number;
        mean_value: number;
        object_ratio: number;
      };
    }
  > = {
    matang: {
      confidence: 0.942,
      probabilities: {
        matang: 0.942,
        setengah_matang: 0.048,
        mentah: 0.01,
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
      },
      color_analysis: {
        mean_hue: 65.2, // Hue hijau di rentang 50-80
        mean_saturation: 142.3,
        mean_value: 156.8,
        object_ratio: 0.45,
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
