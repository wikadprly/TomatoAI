"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { predictTomato } from "@/lib/api";
import { getMockDetection, saveDetectionResult } from "@/lib/storage";

export default function ImageDropzone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;

    // Validasi tipe file
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMessage("Format gambar tidak didukung. Harap gunakan JPG, PNG, atau WebP.");
      return;
    }

    // Validasi ukuran file (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Ukuran gambar melebihi batas 5 MB.");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    // Buat data URL agar bisa disimpan di localStorage untuk preview di halaman hasil
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Panggil backend FastAPI
      const result = await predictTomato(selectedFile);
      // Simpan hasil dan arahkan ke halaman hasil
      saveDetectionResult(result, previewUrl ?? undefined, selectedFile.name);
      router.push("/hasil");
    } catch (err: unknown) {
      console.error("Gagal melakukan prediksi:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses gambar.";
      setErrorMessage(
        `${msg} Pastikan backend FastAPI sedang berjalan di port 8000 (uvicorn app.main:app).`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateDemo = () => {
    if (!selectedFile) return;
    // Fallback simulasi jika backend belum menyala
    const mock = getMockDetection("matang");
    saveDetectionResult(mock.result, previewUrl ?? undefined, selectedFile.name);
    router.push("/hasil");
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />

      {/* Dropzone Container */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          isDragOver
            ? "border-[#3F7D58] bg-[#F0F7EE]"
            : previewUrl
            ? "border-neutral-200 bg-white"
            : "border-neutral-300 bg-white hover:border-[#3F7D58]/60 hover:bg-neutral-50/50"
        }`}
      >
        {previewUrl ? (
          /* Preview State */
          <div className="space-y-4">
            <div className="relative mx-auto aspect-4/3 max-w-sm overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Pratinjau Tomat"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-1 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-800 truncate max-w-xs">
                {selectedFile?.name}
              </span>
              <span>
                {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 0} MB
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3F7D58] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#326446] disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    <span>Memproses dengan AI...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Klasifikasikan Tingkat Kematangan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
              >
                Ganti Foto
              </button>
            </div>
          </div>
        ) : (
          /* Empty / Upload State */
          <div className="py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0F7EE] text-3xl">
              📸
            </div>
            <div>
              <p className="text-base font-bold text-neutral-800">
                Tarik & letakkan foto tomat di sini
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Mendukung JPG, PNG, atau WebP (maksimal 5 MB)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3F7D58] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#326446] transition-colors"
              >
                <span>📁</span>
                <span>Pilih Foto dari Perangkat</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:border-[#3F7D58] hover:text-[#3F7D58] transition-colors"
              >
                <span>📷</span>
                <span>Buka Kamera</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message Box with Demo Fallback */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 space-y-2">
          <p className="font-semibold">⚠️ Gagal Menghubungi API Backend</p>
          <p>{errorMessage}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSimulateDemo}
              className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
            >
              Simulasikan Hasil dengan Foto Ini (Demo Offline)
            </button>
          </div>
        </div>
      )}

      {/* Tips Panduan Pengambilan Foto */}
      <div className="rounded-xl border border-neutral-200/70 bg-white p-4 text-xs text-neutral-500 space-y-1">
        <p className="font-semibold text-neutral-700">💡 Tips untuk Hasil Akurasi Terbaik:</p>
        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-neutral-500">
          <li>Gunakan tomat yang sudah dipetik (*post-harvest*) di atas meja atau piring.</li>
          <li>Pastikan latar belakang cukup polos dan kontras agar segmentasi objek tomat optimal.</li>
          <li>Pencahayaan terang merata tanpa bayangan ekstrem yang menutupi permukaan tomat.</li>
        </ul>
      </div>
    </div>
  );
}