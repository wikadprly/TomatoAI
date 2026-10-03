/**
 * Client untuk berkomunikasi dengan backend FastAPI.
 *
 * Base URL diambil dari environment variable NEXT_PUBLIC_API_BASE_URL.
 * Salin `frontend/.env.example` menjadi `frontend/.env.local`.
 */

import type { HealthResponse, PredictionResponse } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Ambil pesan error dari response FastAPI (field `detail`). */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // response bukan JSON, pakai fallback di bawah
  }
  return `Permintaan gagal dengan status ${response.status}.`;
}

/** Cek apakah backend hidup dan apakah model sudah siap dipakai. */
export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as HealthResponse;
}

/**
 * Kirim satu foto tomat ke backend untuk diklasifikasikan.
 *
 * Endpoint ini akan mengembalikan 503 sampai Tim 2 selesai membuat bobot
 * MobileNetV2, jadi pemanggil harus siap menangani error.
 */
export async function predictTomato(file: File): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/v1/predict`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as PredictionResponse;
}