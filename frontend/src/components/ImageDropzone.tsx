"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { predictTomato } from "@/lib/api";
import { getMockDetection, saveDetectionResult } from "@/lib/storage";

/** Helper ubah data URL ke File asli */
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/** Helper buat foto tomat sintetis realistis via canvas */
function createTomatoCanvas(type: "matang" | "setengah_matang" | "mentah"): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Background polos netral
  ctx.fillStyle = "#F5F7F4";
  ctx.fillRect(0, 0, 400, 400);

  // Buah tomat
  ctx.beginPath();
  ctx.arc(200, 220, 125, 0, Math.PI * 2);

  if (type === "matang") {
    const grad = ctx.createRadialGradient(170, 180, 20, 200, 220, 135);
    grad.addColorStop(0, "#F25C4B");
    grad.addColorStop(0.7, "#D93829");
    grad.addColorStop(1, "#A81E12");
    ctx.fillStyle = grad;
  } else if (type === "setengah_matang") {
    const grad = ctx.createRadialGradient(170, 180, 20, 200, 220, 135);
    grad.addColorStop(0, "#F7D04B");
    grad.addColorStop(0.5, "#E89035");
    grad.addColorStop(1, "#B0551E");
    ctx.fillStyle = grad;
  } else {
    const grad = ctx.createRadialGradient(170, 180, 20, 200, 220, 135);
    grad.addColorStop(0, "#9CCC65");
    grad.addColorStop(0.7, "#558B2F");
    grad.addColorStop(1, "#2E5618");
    ctx.fillStyle = grad;
  }
  ctx.fill();

  // Tangkai hijau
  ctx.fillStyle = "#2E7D32";
  ctx.beginPath();
  ctx.moveTo(196, 90);
  ctx.lineTo(204, 90);
  ctx.lineTo(202, 125);
  ctx.lineTo(198, 125);
  ctx.closePath();
  ctx.fill();

  // Kelopak daun
  ctx.fillStyle = "#388E3C";
  ctx.beginPath();
  ctx.moveTo(200, 120);
  ctx.lineTo(155, 105);
  ctx.lineTo(185, 125);
  ctx.lineTo(165, 145);
  ctx.lineTo(195, 130);
  ctx.lineTo(200, 150);
  ctx.lineTo(205, 130);
  ctx.lineTo(235, 145);
  ctx.lineTo(215, 125);
  ctx.lineTo(245, 105);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function ImageDropzone() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // State untuk Webcam langsung di browser
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Matikan stream kamera saat unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;

    // Validasi tipe file lebih fleksibel (semua format gambar)
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp|jfif)$/i.test(file.name);
    if (!isImage) {
      setErrorMessage("Format file harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }

    // Validasi ukuran file (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Ukuran gambar melebihi batas 5 MB.");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

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

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    stopCamera();
  };

  // Muat sampel instan
  const handleSelectSample = (type: "matang" | "setengah_matang" | "mentah") => {
    stopCamera();
    const dataUrl = createTomatoCanvas(type);
    const names = {
      matang: "sampel_tomat_matang.jpg",
      setengah_matang: "sampel_tomat_setengah_matang.jpg",
      mentah: "sampel_tomat_mentah.jpg",
    };
    const file = dataURLtoFile(dataUrl, names[type]);
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
    setErrorMessage(null);
  };

  // Kontrol Webcam
  const startCamera = async () => {
    setErrorMessage(null);
    handleReset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Gagal membuka kamera:", err);
      setErrorMessage(
        "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser atau gunakan tombol 'Pilih Foto'."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const file = dataURLtoFile(dataUrl, `kamera_tomat_${Date.now()}.jpg`);

    stopCamera();
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await predictTomato(selectedFile);
      saveDetectionResult(result, previewUrl ?? undefined, selectedFile.name);
      router.push("/hasil");
    } catch (err: unknown) {
      console.error("Gagal melakukan prediksi:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses gambar.";
      setErrorMessage(
        `${msg} (Tips: Pastikan backend FastAPI sedang berjalan di port 8000, atau klik tombol simulasi di bawah untuk melanjutkan)`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateDemo = (forcedLevel?: "matang" | "setengah_matang" | "mentah") => {
    if (!selectedFile) return;
    let label: "matang" | "setengah_matang" | "mentah" = "matang";
    if (forcedLevel) {
      label = forcedLevel;
    } else if (selectedFile.name.includes("mentah")) {
      label = "mentah";
    } else if (selectedFile.name.includes("setengah")) {
      label = "setengah_matang";
    }
    const mock = getMockDetection(label);
    saveDetectionResult(mock.result, previewUrl ?? undefined, selectedFile.name);
    router.push("/hasil");
  };

  return (
    <div className="space-y-5">
      {/* Input File Asli (Hidden tetapi terhubung secara NATIVE via <label htmlFor="...">) */}
      <input
        id="tomato-file-input"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          handleFileChange(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        id="tomato-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          handleFileChange(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Area Utama Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          isDragOver
            ? "border-[#3F7D58] bg-[#F0F7EE]"
            : previewUrl || isCameraActive
            ? "border-neutral-200 bg-white"
            : "border-neutral-300 bg-white hover:border-[#3F7D58]/60 hover:bg-neutral-50/50"
        }`}
      >
        {isCameraActive ? (
          /* Kamera Live Stream */
          <div className="space-y-4">
            <div className="relative mx-auto aspect-4/3 max-w-sm overflow-hidden rounded-xl border border-neutral-300 bg-black shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                onLoadedMetadata={() => videoRef.current?.play()}
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-0.5 text-[11px] font-medium text-white">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span>Kamera Aktif</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={capturePhoto}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3F7D58] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#326446] transition-colors"
              >
                <span>📸</span>
                <span>Ambil Foto Tomat</span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        ) : previewUrl ? (
          /* Pratinjau Foto Terpilih */
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
                {selectedFile?.name || "Foto Tomat"}
              </span>
              <span>
                {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : "0"} MB
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3F7D58] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#326446] disabled:opacity-50 transition-colors cursor-pointer"
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
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Ganti Foto
              </button>
            </div>
          </div>
        ) : (
          /* Tampilan Awal Upload */
          <div className="py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0F7EE] text-3xl">
              📸
            </div>
            <div>
              <p className="text-base font-bold text-neutral-800">
                Pilih atau seret foto tomat ke sini
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Mendukung semua format gambar JPG, PNG, atau WebP (maksimal 5 MB)
              </p>
            </div>

            {/* Tombol Native dengan <label htmlFor="..."> */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label
                htmlFor="tomato-file-input"
                className="inline-flex items-center gap-2 rounded-xl bg-[#3F7D58] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#326446] transition-colors cursor-pointer select-none"
              >
                <span>📁</span>
                <span>Pilih Foto dari Perangkat</span>
              </label>

              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:border-[#3F7D58] hover:text-[#3F7D58] transition-colors cursor-pointer"
              >
                <span>📷</span>
                <span>Buka Kamera</span>
              </button>
            </div>

            {/* Tombol Uji Langsung dengan Sampel Tomat */}
            <div className="pt-4 border-t border-neutral-100">
              <p className="text-xs font-medium text-neutral-400 mb-2">
                Atau coba langsung dengan sampel tomat:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectSample("matang")}
                  className="rounded-lg border border-[#F8D2D2] bg-[#FDF2F2] px-3 py-1.5 text-xs font-semibold text-[#CB5B5B] hover:bg-red-100 transition-colors cursor-pointer"
                >
                  🍅 Tomat Matang
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample("setengah_matang")}
                  className="rounded-lg border border-[#FCE8B0] bg-[#FEF9EB] px-3 py-1.5 text-xs font-semibold text-[#B88710] hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  🍊 Tomat 1/2 Matang
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample("mentah")}
                  className="rounded-lg border border-[#D1E7CB] bg-[#F0F7EE] px-3 py-1.5 text-xs font-semibold text-[#3F7D58] hover:bg-green-100 transition-colors cursor-pointer"
                >
                  🍏 Tomat Mentah
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Box with Demo Fallback */}
      {errorMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
          <p className="font-semibold">⚠️ Informasi Koneksi API</p>
          <p>{errorMessage}</p>
          {previewUrl && (
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSimulateDemo()}
                className="rounded-lg bg-[#3F7D58] px-3 py-1.5 font-medium text-white hover:bg-[#326446] cursor-pointer"
              >
                Lihat Hasil Deteksi Foto Ini (Simulasi Lengkap)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tips Panduan */}
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