import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PredictionResponse } from "./types";
import {
  clearDetectionHistory,
  deleteHistoryItem,
  getDetectionHistory,
  getLatestDetection,
  getMockDetection,
  saveDetectionResult,
} from "./storage";

const RESULT: PredictionResponse = {
  label: "matang",
  confidence: 0.93,
  probabilities: { mentah: 0.01, setengah_matang: 0.06, matang: 0.93 },
  color_analysis: {
    mean_hue: 3,
    mean_saturation: 180,
    mean_value: 150,
    object_ratio: 0.5,
  },
  segmentation: {
    mask_png: "data:image/png;base64,AAAA",
    model_input_jpeg: "data:image/jpeg;base64,BBBB",
    overlay_jpeg: "data:image/jpeg;base64,CCCC",
  },
  shape_metrics: {
    area_ratio: 0.5,
    circularity: 0.8,
    fill_ratio: 0.7,
    solidity: 0.9,
    aspect_ratio: 1,
  },
  input_mode: "original",
};

function resetStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

describe("storage deteksi", () => {
  beforeEach(resetStorage);
  afterEach(() => {
    vi.restoreAllMocks();
    resetStorage();
  });

  it("menyimpan hasil terbaru dan menambahkannya ke riwayat", () => {
    saveDetectionResult(RESULT, "data:image/jpeg;base64,AAA", "tomat.jpg");

    const latest = getLatestDetection();
    expect(latest?.result.label).toBe("matang");
    expect(latest?.source).toBe("model");
    expect(getDetectionHistory()).toHaveLength(1);
  });

  it("menyimpan artefak segmentasi agar panel visual tetap tampil di riwayat", () => {
    saveDetectionResult(RESULT);
    const record = getDetectionHistory()[0];
    expect(record.result.segmentation?.mask_png).toContain("data:image/png");
    expect(record.result.shape_metrics?.circularity).toBe(0.8);
  });

  it("menandai sumber heuristik dengan benar", () => {
    saveDetectionResult(RESULT, undefined, "x.jpg", "heuristic");
    expect(getLatestDetection()?.source).toBe("heuristic");
  });

  it("mengabaikan data rusak di localStorage tanpa crash", () => {
    localStorage.setItem("tomatoai_detection_history", "{bukan json");
    expect(getDetectionHistory()).toEqual([]);

    localStorage.setItem(
      "tomatoai_detection_history",
      JSON.stringify([{ result: { label: "kelas_palsu", confidence: 1 } }])
    );
    expect(getDetectionHistory()).toEqual([]);
  });

  it("membuang data URL yang bukan gambar", () => {
    saveDetectionResult({
      ...RESULT,
      segmentation: {
        mask_png: "javascript:alert(1)",
        model_input_jpeg: null,
        overlay_jpeg: null,
      },
    });
    const record = getDetectionHistory()[0];
    expect(record.result.segmentation).toBeNull();
  });

  it("menghapus satu item dan menyinkronkan hasil terbaru", () => {
    const first = saveDetectionResult(RESULT, undefined, "a.jpg");
    saveDetectionResult(RESULT, undefined, "b.jpg");

    const remaining = deleteHistoryItem(first.id);
    expect(remaining).toHaveLength(1);
    expect(getLatestDetection()?.fileName).toBe("b.jpg");
  });

  it("membersihkan seluruh riwayat termasuk hasil terbaru", () => {
    saveDetectionResult(RESULT);
    clearDetectionHistory();

    expect(getDetectionHistory()).toEqual([]);
    expect(getLatestDetection()).toBeNull();
  });

  it("menyimpan riwayat tanpa gambar ketika kuota penuh", () => {
    // jsdom di sini memakai MemoryStorage dari vitest.setup.ts, jadi spy
    // dipasang pada instance yang benar-benar dipakai modul storage.
    const original = window.localStorage.setItem.bind(window.localStorage);
    // Tiga kegagalan: tulis awal + dua strategi pertama gagal, strategi
    // terakhir (tanpa gambar sama sekali) yang berhasil.
    let failures = 3;

    vi.spyOn(window.localStorage, "setItem").mockImplementation(
      (key: string, value: string) => {
        if (key === "tomatoai_detection_history" && failures > 0) {
          failures -= 1;
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
        original(key, value);
      }
    );

    const record = saveDetectionResult(RESULT, "data:image/jpeg;base64,AAA");

    const history = getDetectionHistory();
    expect(history).toHaveLength(1);
    expect(history[0].imageUrl).toBeUndefined();
    expect(record.imageUrl).toBeDefined();
  });
});

describe("getMockDetection", () => {
  it("menghasilkan data demo yang ditandai sebagai demo", () => {
    const mock = getMockDetection("mentah");
    expect(mock.result.label).toBe("mentah");
    expect(mock.source).toBe("demo");
    expect(mock.result.probabilities.mentah).toBeGreaterThan(0.5);
  });
});
