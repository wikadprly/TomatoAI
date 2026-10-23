/**
 * Bentuk data yang dikirim backend FastAPI ke frontend.
 *
 * Sengaja memakai nama snake_case yang sama dengan backend
 * (`backend/app/schemas/prediction.py`) supaya tidak perlu kode pengubah
 * format di frontend.
 */

/** Tiga tingkat kematangan tomat yang diklasifikasikan model. */
export const MATURITY_LEVELS = ["mentah", "setengah_matang", "matang"] as const;

export type MaturityLevel = (typeof MATURITY_LEVELS)[number];

export type ColorAnalysis = {
  mean_hue: number | null;
  mean_saturation: number | null;
  mean_value: number | null;
  object_ratio: number | null;
};

export type PredictionResponse = {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
  color_analysis: ColorAnalysis | null;
};

export type HealthResponse = {
  status: string;
  app: string;
  version: string;
  model_loaded: boolean;
};

/**
 * Asal sebuah hasil deteksi.
 *
 * - `model`      = output MobileNetV2 asli dari backend FastAPI.
 * - `heuristic`  = analisis warna HSV sederhana di browser
 *                   (dipakai saat backend offline; confidence di-hardcode).
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