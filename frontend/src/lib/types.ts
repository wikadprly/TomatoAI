/**
 * Bentuk data yang dikirim backend FastAPI ke frontend.
 *
 * Sengaja memakai nama snake_case yang sama dengan backend
 * (`backend/app/schemas/prediction.py`) supaya tidak perlu kode pengubah
 * format di frontend.
 */

/** Tingkat kematangan tomat + kelas penolakan yang diklasifikasikan model. */
export const MATURITY_LEVELS = [
  "mentah",
  "setengah_matang",
  "matang",
  "bukan_tomat",
] as const;

export type MaturityLevel = (typeof MATURITY_LEVELS)[number];

export type ColorAnalysis = {
  mean_hue: number | null;
  mean_saturation: number | null;
  mean_value: number | null;
  object_ratio: number | null;
};

/** Visual hasil pengolahan citra, berupa data URL siap pakai di `img.src`. */
export type SegmentationImages = {
  mask_png: string | null;
  model_input_jpeg: string | null;
  overlay_jpeg: string | null;
};

/** Metrik bentuk mask yang dipakai guard (juga ditampilkan ke pengguna). */
export type ShapeMetrics = {
  area_ratio: number;
  circularity: number;
  fill_ratio: number;
  solidity: number;
  aspect_ratio: number;
};

export type PredictionResponse = {
  label: MaturityLevel;
  confidence: number;
  /** Sebagian kelas bisa absen pada data lama/demo; komponen menganggap 0. */
  probabilities: Partial<Record<MaturityLevel, number>>;
  color_analysis: ColorAnalysis | null;
  segmentation?: SegmentationImages | null;
  shape_metrics?: ShapeMetrics | null;
  input_mode?: string | null;
};

export type HealthResponse = {
  status: string;
  app: string;
  version: string;
  model_loaded: boolean;
  uptime_seconds?: number | null;
  input_mode?: string | null;
};

export type ClassMetric = {
  label: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
};

/** Ringkasan performa model dari `GET /api/v1/model/info`. */
export type ModelInfo = {
  model_name: string;
  generated_at: string | null;
  image_size: number;
  class_names: string[];
  test_set_size: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusion_matrix: number[][];
  per_class: ClassMetric[];
  input_mode: string;
  guard_enabled: boolean;
};

/** Alasan penolakan guard yang terstruktur (isi `detail` pada respons 422). */
export type GuardDetail = {
  code: string;
  message: string;
  hints: string[];
  metric?: string;
  value?: number;
  threshold?: number;
};

/**
 * Asal sebuah hasil deteksi.
 *
 * - `model`      = output MobileNetV2 asli dari backend FastAPI.
 * - `heuristic`  = analisis warna HSV sederhana di browser
 *                   (dipilih eksplisit oleh pengguna saat backend mati).
 * - `demo`       = data sampel statis untuk pratinjau tampilan.
 */
export type DetectionSource = "model" | "heuristic" | "demo";

export type DetectionRecord = {
  id: string;
  timestamp: string;
  imageUrl?: string;
  fileName?: string;
  result: PredictionResponse;
  source?: DetectionSource;
};
