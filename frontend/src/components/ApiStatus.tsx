"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";

type Status = "checking" | "online" | "offline";

/**
 * Indikator status backend. Tujuannya supaya pengguna tahu apakah hasil nanti
 * berasal dari MobileNetV2 atau dari analisis lokal yang harus dipilih sendiri.
 */
export default function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    // getHealth belum menerima signal; batasi dengan timeout balapan agar
    // indikator tidak menggantung saat backend lambat.
    const timer = setTimeout(() => {
      if (!cancelled) setStatus("offline");
    }, 6000);

    getHealth()
      .then((health) => {
        if (cancelled) return;
        clearTimeout(timer);
        setModelLoaded(Boolean(health.model_loaded));
        setStatus("online");
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(timer);
        setStatus("offline");
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const config: Record<Status, { label: string; className: string; dot: string }> = {
    checking: {
      label: "Memeriksa koneksi ke server model...",
      className: "border-neutral-200 bg-white text-neutral-600",
      dot: "bg-neutral-400 animate-pulse",
    },
    online: {
      label: modelLoaded
        ? "Server model aktif — hasil akan dihitung dengan MobileNetV2."
        : "Server terjangkau, tetapi model belum dimuat — hasil bisa ditolak.",
      className: "border-mentah-border bg-mentah-bg text-mentah-text",
      dot: "bg-mentah",
    },
    offline: {
      label:
        "Server model tidak terjangkau — Anda dapat memilih analisis warna lokal di browser (bukan AI).",
      className: "border-amber-200 bg-amber-50 text-amber-900",
      dot: "bg-amber-500",
    },
  };

  const current = config[status];

  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${current.className}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${current.dot}`}
      />
      <span>{current.label}</span>
    </p>
  );
}
