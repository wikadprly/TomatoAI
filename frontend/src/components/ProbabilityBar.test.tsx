import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ProbabilityBar from "./ProbabilityBar";

describe("ProbabilityBar", () => {
  it("menampilkan semua kelas beserta persentasenya", () => {
    render(
      <ProbabilityBar
        probabilities={{
          mentah: 0.1,
          setengah_matang: 0.2,
          matang: 0.7,
          bukan_tomat: 0,
        }}
        predictedLabel="matang"
      />
    );

    expect(screen.getByText(/Mentah/)).toBeInTheDocument();
    expect(screen.getByText(/Setengah Matang/)).toBeInTheDocument();
    expect(screen.getByText(/Bukan Tomat/)).toBeInTheDocument();
    expect(screen.getByText("70.0%")).toBeInTheDocument();
  });

  it("memakai persentase 0 untuk kelas yang tidak ada di respons", () => {
    render(
      <ProbabilityBar
        probabilities={{ matang: 1 }}
        predictedLabel="matang"
      />
    );

    expect(screen.getAllByText("0.0%").length).toBeGreaterThan(0);
  });

  it("memberi label aksesibel pada setiap bar", () => {
    render(<ProbabilityBar probabilities={{ matang: 0.8 }} predictedLabel="matang" />);
    expect(screen.getByLabelText("Matang: 80.0 persen")).toBeInTheDocument();
  });
});
