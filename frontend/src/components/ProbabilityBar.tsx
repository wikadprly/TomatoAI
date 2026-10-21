import React from "react";

interface ProbabilityBarProps {
  probabilities: Record<string, number>;
  predictedLabel: string;
}

const classMeta: Record<
  string,
  {
    name: string;
    barColor: string;
    textColor: string;
  }
> = {
  mentah: {
    name: "Mentah",
    barColor: "bg-[#6FA665]",
    textColor: "text-[#3F7D58]",
  },
  setengah_matang: {
    name: "Setengah Matang",
    barColor: "bg-[#E8BE4C]",
    textColor: "text-[#B88710]",
  },
  matang: {
    name: "Matang",
    barColor: "bg-[#CB5B5B]",
    textColor: "text-[#CB5B5B]",
  },
};

export default function ProbabilityBar({
  probabilities,
  predictedLabel,
}: ProbabilityBarProps) {
  const normalizedPredicted = (predictedLabel || "").toLowerCase().replace(/\s+/g, "_");

  // Susun sesuai urutan standar: mentah, setengah_matang, matang
  const classes = ["mentah", "setengah_matang", "matang"];

  return (
    <div className="space-y-3.5">
      {classes.map((cls) => {
        const prob = probabilities[cls] ?? 0;
        const percentage = (prob * 100).toFixed(1);
        const meta = classMeta[cls] || {
          name: cls,
          barColor: "bg-neutral-500",
          textColor: "text-neutral-700",
        };
        const isWinner = cls === normalizedPredicted;

        return (
          <div key={cls} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-medium ${
                  isWinner ? `${meta.textColor} font-semibold` : "text-neutral-600"
                }`}
              >
                {meta.name} {isWinner && "✓"}
              </span>
              <span className={`tabular-nums ${isWinner ? "font-bold text-neutral-800" : "text-neutral-500"}`}>
                {percentage}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${meta.barColor} ${
                  isWinner ? "opacity-100" : "opacity-40"
                }`}
                style={{ width: `${Math.max(2, Number(percentage))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
