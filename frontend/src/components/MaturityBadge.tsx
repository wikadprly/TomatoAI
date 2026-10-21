import React from "react";
import type { MaturityLevel } from "@/lib/types";

interface MaturityBadgeProps {
  level: string | MaturityLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const levelConfigs: Record<
  string,
  {
    name: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    icon: string;
    description: string;
  }
> = {
  mentah: {
    name: "Mentah",
    bgClass: "bg-[#F0F7EE]",
    textClass: "text-[#3F7D58]",
    borderClass: "border-[#D1E7CB]",
    icon: "🌱",
    description: "Kandungan klorofil dominan tinggi, tekstur padat/keras, belum siap dikonsumsi langsung.",
  },
  setengah_matang: {
    name: "Setengah Matang",
    bgClass: "bg-[#FEF9EB]",
    textClass: "text-[#B88710]",
    borderClass: "border-[#FCE8B0]",
    icon: "⚡",
    description: "Transisi warna hijau ke kemerahan/oranye, cocok untuk pengiriman jarak jauh atau penyimpanan.",
  },
  matang: {
    name: "Matang",
    bgClass: "bg-[#FDF2F2]",
    textClass: "text-[#CB5B5B]",
    borderClass: "border-[#F8D2D2]",
    icon: "🍅",
    description: "Likopen merah berkembang penuh, rasa manis asam seimbang, siap dikonsumsi atau diolah.",
  },
};

export default function MaturityBadge({
  level,
  size = "md",
  className = "",
}: MaturityBadgeProps) {
  const normalizedKey = (level || "").toLowerCase().replace(/\s+/g, "_");
  const config = levelConfigs[normalizedKey] || {
    name: level || "Tidak Diketahui",
    bgClass: "bg-neutral-100",
    textClass: "text-neutral-700",
    borderClass: "border-neutral-200",
    icon: "❓",
    description: "",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-3 py-1 text-sm gap-2",
    lg: "px-4 py-1.5 text-base font-semibold gap-2.5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses[size]} ${className}`}
    >
      <span>{config.icon}</span>
      <span>{config.name}</span>
    </span>
  );
}

export function getMaturityDescription(level: string): string {
  const normalizedKey = (level || "").toLowerCase().replace(/\s+/g, "_");
  return levelConfigs[normalizedKey]?.description || "";
}
