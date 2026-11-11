import { describe, expect, it } from "vitest";

import { ApiError, parseApiError } from "./api";
import type { GuardDetail } from "./types";

describe("parseApiError", () => {
  it("memetakan detail guard terstruktur ke ApiError", () => {
    const detail: GuardDetail = {
      code: "shape_not_round",
      message: "Bentuk objek tidak menyerupai tomat.",
      hints: ["Gunakan satu tomat saja.", "Latar polos."],
      metric: "circularity",
      value: 0.12,
      threshold: 0.2,
    };

    const error = parseApiError(422, JSON.stringify({ detail }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.isGuardRejection).toBe(true);
    expect(error.code).toBe("shape_not_round");
    expect(error.hints).toHaveLength(2);
    expect(error.metric).toBe("circularity");
    expect(error.value).toBeCloseTo(0.12);
    expect(error.threshold).toBeCloseTo(0.2);
  });

  it("memakai detail string untuk error biasa", () => {
    const error = parseApiError(415, JSON.stringify({ detail: "Format salah." }));
    expect(error.message).toBe("Format salah.");
    expect(error.hints).toEqual([]);
  });

  it("memberi pesan fallback saat body bukan JSON", () => {
    const error = parseApiError(500, "<html>oops</html>");
    expect(error.status).toBe(500);
    expect(error.message).toContain("500");
  });
});
