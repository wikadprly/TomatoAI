import type { MaturityLevel } from "@/lib/types";
import { getClassMeta } from "@/lib/maturity";

interface MaturityBadgeProps {
  level: string | MaturityLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs gap-1.5",
  md: "px-3 py-1 text-sm gap-2",
  lg: "px-4 py-1.5 text-base font-semibold gap-2.5",
} as const;

const dotClasses = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
} as const;

export default function MaturityBadge({
  level,
  size = "md",
  className = "",
}: MaturityBadgeProps) {
  const meta = getClassMeta(level);

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${meta.badgeBgClass} ${meta.textClass} ${meta.badgeBorderClass} ${sizeClasses[size]} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`rounded-full ${meta.barClass} ${dotClasses[size]}`}
      />
      <span>{meta.name}</span>
    </span>
  );
}

export function getMaturityDescription(level: string): string {
  return getClassMeta(level).description;
}
