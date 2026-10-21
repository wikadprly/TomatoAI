"use client";

import React from "react";
import type { DetectionRecord } from "@/lib/types";
import MaturityBadge from "./MaturityBadge";

interface HistoryListProps {
  history: DetectionRecord[];
  onSelectRecord: (record: DetectionRecord) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export default function HistoryList({
  history,
  onSelectRecord,
  onDeleteItem,
  onClearAll,
}: HistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-400">
        <p>Belum ada riwayat deteksi yang tersimpan di perangkat ini.</p>
        <p className="mt-1 text-xs text-neutral-400">
          Setiap deteksi yang Anda lakukan akan otomatis tersimpan di sini secara lokal.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
        <div>
          <h3 className="font-semibold text-neutral-800">Riwayat Deteksi Terkini</h3>
          <p className="text-xs text-neutral-500">
            Tersimpan lokal di browser ({history.length} deteksi)
          </p>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
        >
          Hapus Semua
        </button>
      </div>

      <div className="mt-4 divide-y divide-neutral-100">
        {history.map((item) => {
          const dateStr = new Date(item.timestamp).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={item.id}
              className="flex items-center justify-between py-3.5 hover:bg-neutral-50/70 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div
                className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0 mr-3"
                onClick={() => onSelectRecord(item)}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.fileName || "Tomat"}
                    className="h-12 w-12 rounded-lg object-cover border border-neutral-200 shrink-0"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 text-lg shrink-0">
                    🍅
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {item.fileName || "Foto Tomat"}
                    </p>
                    <MaturityBadge level={item.result.label} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
                    <span>{dateStr}</span>
                    <span>•</span>
                    <span>Keyakinan: {(item.result.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectRecord(item)}
                  className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  Buka
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id);
                  }}
                  className="rounded-md p-1 text-neutral-400 hover:text-red-500 hover:bg-neutral-100"
                  title="Hapus deteksi ini"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
