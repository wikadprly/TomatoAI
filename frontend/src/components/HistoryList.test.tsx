import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DetectionRecord } from "@/lib/types";
import HistoryList from "./HistoryList";

function makeRecord(overrides: Partial<DetectionRecord> = {}): DetectionRecord {
  return {
    id: "det_1",
    timestamp: new Date("2026-11-01T10:00:00Z").toISOString(),
    fileName: "tomat_a.jpg",
    result: {
      label: "matang",
      confidence: 0.9,
      probabilities: { matang: 0.9, mentah: 0.1 },
      color_analysis: null,
    },
    source: "model",
    ...overrides,
  };
}

describe("HistoryList", () => {
  it("menampilkan empty state saat belum ada riwayat", () => {
    render(
      <HistoryList
        history={[]}
        onSelectRecord={vi.fn()}
        onDeleteItem={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Belum ada riwayat deteksi/)
    ).toBeInTheDocument();
  });

  it("memanggil onSelectRecord saat baris diklik", async () => {
    const user = userEvent.setup();
    const onSelectRecord = vi.fn();
    const record = makeRecord();

    render(
      <HistoryList
        history={[record]}
        onSelectRecord={onSelectRecord}
        onDeleteItem={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /Buka hasil deteksi tomat_a\.jpg/ })
    );

    expect(onSelectRecord).toHaveBeenCalledWith(record);
  });

  it("memanggil onDeleteItem dengan id record", async () => {
    const user = userEvent.setup();
    const onDeleteItem = vi.fn();

    render(
      <HistoryList
        history={[makeRecord()]}
        onSelectRecord={vi.fn()}
        onDeleteItem={onDeleteItem}
        onClearAll={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /Hapus deteksi tomat_a\.jpg/ })
    );

    expect(onDeleteItem).toHaveBeenCalledWith("det_1");
  });

  it("menampilkan label sumber yang jujur (bukan AI untuk heuristik)", () => {
    render(
      <HistoryList
        history={[makeRecord({ id: "det_2", source: "heuristic" })]}
        onSelectRecord={vi.fn()}
        onDeleteItem={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText("Heuristik")).toBeInTheDocument();
  });
});
