import { describe, expect, it } from "vitest";

import { CLASS_META, CLASS_ORDER, getClassMeta, normalizeLevel } from "./maturity";

describe("normalizeLevel", () => {
  it("menormalkan label dari API menjadi kunci metadata", () => {
    expect(normalizeLevel("Setengah Matang")).toBe("setengah_matang");
    expect(normalizeLevel("  MATANG ")).toBe("matang");
    expect(normalizeLevel("")).toBe("");
  });
});

describe("getClassMeta", () => {
  it("mengembalikan metadata lengkap untuk semua kelas model", () => {
    for (const level of CLASS_ORDER) {
      const meta = getClassMeta(level);
      expect(meta.name).not.toBe("Tidak Diketahui");
      expect(meta.strokeClass).toMatch(/^stroke-/);
      expect(meta.barClass).toMatch(/^bg-/);
    }
  });

  it("menerima label ber-spasi dari backend", () => {
    expect(getClassMeta("Setengah Matang").name).toBe("Setengah Matang");
  });

  it("memberi fallback netral untuk label tak dikenal tanpa crash", () => {
    const meta = getClassMeta("kelas_ajaib");
    expect(meta.name).toBe("kelas_ajaib");
    expect(meta.barClass).toBe("bg-neutral-500");
  });

  it("menjaga setiap kelas punya warna gauge yang berbeda", () => {
    const strokes = CLASS_ORDER.map((level) => CLASS_META[level].strokeClass);
    expect(new Set(strokes).size).toBeGreaterThan(2);
  });
});
