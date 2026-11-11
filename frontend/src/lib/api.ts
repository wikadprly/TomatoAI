/**
 * Client untuk berkomunikasi dengan backend FastAPI.
 *
 * Base URL diambil dari environment variable NEXT_PUBLIC_API_BASE_URL.
 * Salin `frontend/.env.example` menjadi `frontend/.env.local`.
 */

import type { GuardDetail, HealthResponse, ModelInfo, PredictionResponse } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Batas waktu request prediksi. Cold start hosting gratis bisa >30 detik. */
const PREDICT_TIMEOUT_MS = 90_000;

/**
 * Error dari API yang membawa HTTP status code asli.
 *
 * Pemanggil perlu membedakan "backend mati/tidak terjangkau" (tidak boleh
 * berpura-pura jadi hasil) dengan "request ditolak server" (415/422 —
 * pengguna harus memperbaiki fotonya).
 *
 * Untuk penolakan guard (422), `detail` dari backend juga membawa `code`,
 * `hints`, dan metrik yang dilanggar sehingga UI bisa menampilkan saran
 * perbaikan yang spesifik.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly hints: string[];
  readonly metric: string | null;
  readonly value: number | null;
  readonly threshold: number | null;

  constructor(
    message: string,
    status: number,
    detail?: Partial<GuardDetail> | null
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = detail?.code ?? null;
    this.hints = detail?.hints ?? [];
    this.metric = detail?.metric ?? null;
    this.value = detail?.value ?? null;
    this.threshold = detail?.threshold ?? null;
  }

  /** True bila backend menolak isi foto (bukan masalah jaringan). */
  get isGuardRejection(): boolean {
    return this.status === 422;
  }
}

type ParsedError = { message: string; detail: Partial<GuardDetail> | null };

/**
 * Ambil pesan error dari response FastAPI.
 *
 * Backend mengirim `detail` berupa string untuk error biasa, dan objek
 * `{ code, message, hints }` untuk penolakan guard.
 */
async function readErrorMessage(response: Response): Promise<ParsedError> {
  try {
    const body = await response.json();
    const detail = body?.detail;

    if (typeof detail === "string") {
      return { message: detail, detail: null };
    }

    if (detail && typeof detail === "object" && typeof detail.message === "string") {
      return {
        message: detail.message,
        detail: {
          code: detail.code,
          hints: Array.isArray(detail.hints) ? detail.hints : [],
          metric: detail.metric,
          value: detail.value,
          threshold: detail.threshold,
        },
      };
    }
  } catch {
    // response bukan JSON, pakai fallback di bawah
  }

  return {
    message: `Permintaan gagal dengan status ${response.status}.`,
    detail: null,
  };
}

/**
 * Ubah isi respons error menjadi `ApiError`.
 *
 * Dipisah supaya jalur `fetch` (health/model info) dan jalur
 * XMLHttpRequest (prediksi, untuk progres unggah) memakai pemetaan yang
 * sama — termasuk detail guard terstruktur.
 */
export function parseApiError(status: number, rawBody: string): ApiError {
  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }

  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") {
    return new ApiError(detail, status);
  }

  if (detail && typeof detail === "object") {
    const guard = detail as Partial<GuardDetail>;
    return new ApiError(
      typeof guard.message === "string"
        ? guard.message
        : `Permintaan gagal dengan status ${status}.`,
      status,
      guard
    );
  }

  return new ApiError(`Permintaan gagal dengan status ${status}.`, status);
}

async function throwApiError(response: Response): Promise<never> {
  const { message, detail } = await readErrorMessage(response);
  throw new ApiError(message, response.status, detail);
}

/** Cek apakah backend hidup dan apakah model sudah siap dipakai. */
export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  return (await response.json()) as HealthResponse;
}

/** Ambil ringkasan performa model (akurasi, F1, confusion matrix). */
export async function getModelInfo(): Promise<ModelInfo> {
  const response = await fetch(`${API_BASE_URL}/api/v1/model/info`, {
    cache: "no-store",
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  return (await response.json()) as ModelInfo;
}

/**
 * Kirim satu foto tomat ke backend untuk diklasifikasikan.
 *
 * Request diberi batas waktu 90 detik lewat AbortController supaya spinner
 * "Memproses..." tidak berputar tanpa batas bila backend menerima koneksi
 * tetapi macet saat inferensi. Batas ini juga memberi ruang untuk cold start
 * hosting gratis (mis. Hugging Face Spaces) yang bisa >30 detik.
 */
export async function predictTomato(file: File): Promise<PredictionResponse> {
  return predictTomatoWithProgress(file);
}

/**
 * Sama seperti {@link predictTomato}, tetapi melaporkan progres unggah.
 *
 * Memakai XMLHttpRequest karena `fetch` tidak menyediakan event progres
 * upload. Setelah unggahan selesai, inferensi tetap berjalan di server —
 * pemanggil bisa mengubah label menjadi "menganalisis".
 */
export function predictTomatoWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<PredictionResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/v1/predict`);
    xhr.timeout = PREDICT_TIMEOUT_MS;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      const { status, responseText } = xhr;

      if (status >= 200 && status < 300) {
        try {
          onProgress?.(100);
          resolve(JSON.parse(responseText) as PredictionResponse);
        } catch {
          reject(new ApiError("Respons server tidak dapat dibaca.", status));
        }
        return;
      }

      reject(parseApiError(status, responseText));
    };

    xhr.onerror = () => {
      reject(new ApiError("Tidak dapat menghubungi server model.", 0));
    };

    xhr.ontimeout = () => {
      reject(
        new ApiError(
          "Backend tidak merespons dalam 90 detik. Periksa koneksi dan status server API.",
          408
        )
      );
    };

    xhr.send(formData);
  });
}
