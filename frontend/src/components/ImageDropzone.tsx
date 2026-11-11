"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, predictTomatoWithProgress } from "@/lib/api";
import { saveDetectionResult } from "@/lib/storage";
import { analyzeTomatoClientSide } from "@/lib/clientClassifier";
import { compressImageForUpload, createThumbnail } from "@/lib/image";

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

  const grad = ctx.createRadialGradient(170, 180, 20, 200, 220, 135);
  if (type === "matang") {
    grad.addColorStop(0, "#F25C4B");
    grad.addColorStop(0.7, "#D93829");
    grad.addColorStop(1, "#A81E12");
  } else if (type === "setengah_matang") {
    grad.addColorStop(0, "#F7D04B");
    grad.addColorStop(0.5, "#E89035");
    grad.addColorStop(1, "#B0551E");
  } else {
    grad.addColorStop(0, "#9CCC65");
    grad.addColorStop(0.7, "#558B2F");
    grad.addColorStop(1, "#2E5618");
  }
  ctx.fillStyle = grad;
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

/** Nama file unik untuk hasil jepretan kamera. */
function cameraFileName(): string {
  return `kamera_tomat_${Date.now()}.jpg`;
}

const samples: { type: "matang" | "setengah_matang" | "mentah"; label: string; dot: string }[] =
  [
    { type: "matang", label: "Tomat Matang", dot: "bg-matang" },
    { type: "setengah_matang", label: "Tomat 1/2 Matang", dot: "bg-setengah" },
    { type: "mentah", label: "Tomat Mentah", dot: "bg-mentah" },
  ];

const METRIC_LABELS: Record<string, string> = {
  area_ratio: "Luas objek",
  circularity: "Kebulatan",
  fill_ratio: "Kepadatan",
  solidity: "Soliditas",
  aspect_ratio: "Rasio aspek",
  confidence: "Keyakinan model",
  margin: "Selisih keyakinan",
};

type DropzoneError = {
  title: string;
  message: string;
  hints: string[];
  metric?: { label: string; value: number; threshold?: number };
  /** True bila analisis warna lokal boleh ditawarkan sebagai alternatif. */
  allowLocalFallback: boolean;
};

function buildGuardError(err: ApiError): DropzoneError {
  const label = err.metric ? METRIC_LABELS[err.metric] : undefined;
  const metric =
    label && typeof err.value === "number"
      ? {
          label,
          value: err.value,
          threshold: err.threshold ?? undefined,
        }
      : undefined;

  return {
    title: "Foto belum bisa diproses",
    message: err.message,
    hints: err.hints,
    metric,
    allowLocalFallback: false,
  };
}

function buildTransportError(err: ApiError): DropzoneError {
  if (err.status === 429) {
    return {
      title: "Server sedang sibuk",
      message: err.message,
      hints: [
        "Tunggu sekitar satu menit lalu coba lagi.",
        "Hindari menekan tombol klasifikasi berulang kali.",
      ],
      allowLocalFallback: true,
    };
  }

  if (err.status === 503) {
    return {
      title: "Server model belum siap",
      message: err.message,
      hints: [
        "Server menerima permintaan tetapi model belum selesai dimuat.",
        "Tunggu beberapa detik lalu coba lagi.",
      ],
      allowLocalFallback: true,
    };
  }

  return {
    title: "Server model tidak terjangkau",
    message: err.message,
    hints: [
      "Pastikan backend berjalan di alamat yang dikonfigurasi.",
      "Periksa koneksi jaringan Anda.",
      "Anda bisa memakai analisis warna lokal di bawah sebagai alternatif (bukan AI).",
    ],
    allowLocalFallback: true,
  };
}

export default function ImageDropzone() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing">("idle");
  const [error, setError] = useState<DropzoneError | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  const isLoading = phase !== "idle";

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

    // Validasi mengikuti allowlist backend (image/jpeg, image/png, image/webp)
    // supaya file yang lolos di sini tidak ditolak 415 oleh server.
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const extOk = /\.(jpe?g|png|webp)$/i.test(file.name);
    const typeOk =
      ALLOWED_TYPES.includes(file.type) ||
      // Beberapa OS melaporkan tipe non-standar "image/jpg" atau tipe
      // kosong — izinkan selama ekstensinya benar.
      ((file.type === "image/jpg" || file.type === "") && extOk);
    if (!typeOk) {
      setError({
        title: "Format file tidak didukung",
        message: "Format file harus JPG, PNG, atau WebP.",
        hints: ["Ubah foto ke JPG/PNG terlebih dahulu."],
        allowLocalFallback: false,
      });
      return;
    }

    // Samakan tipe non-standar "image/jpg" ke "image/jpeg" agar diterima
    // backend (File.type tidak bisa diubah langsung, jadi dibuat File baru).
    const normalized =
      file.type === "image/jpg"
        ? new File([file], file.name, {
            type: "image/jpeg",
            lastModified: file.lastModified,
          })
        : file;

    // Validasi ukuran file (5 MB)
    if (normalized.size > 5 * 1024 * 1024) {
      setError({
        title: "Foto terlalu besar",
        message: "Ukuran gambar melebihi batas 5 MB.",
        hints: ["Perkecil foto atau ambil ulang dengan resolusi lebih rendah."],
        allowLocalFallback: false,
      });
      return;
    }

    setError(null);
    setSelectedFile(normalized);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(normalized);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploadPercent(0);
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
    setError(null);
  };

  // Bind stream kamera ke elemen video saat kamera aktif
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => console.warn("Video play error:", err));
    }
  }, [isCameraActive]);

  // Kontrol Webcam
  const startCamera = async () => {
    setError(null);
    handleReset();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({
        title: "Kamera tidak didukung",
        message:
          "Browser ini tidak mendukung akses kamera. Gunakan tombol 'Pilih Foto dari Perangkat'.",
        hints: [],
        allowLocalFallback: false,
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      console.error("Gagal membuka kamera:", err);
      setError({
        title: "Kamera tidak bisa dibuka",
        message:
          "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser atau gunakan tombol 'Pilih Foto dari Perangkat'.",
        hints: [
          "Periksa izin kamera pada ikon gembok di address bar.",
          "Tutup aplikasi lain yang sedang memakai kamera.",
        ],
        allowLocalFallback: false,
      });
    }
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
    const file = dataURLtoFile(dataUrl, cameraFileName());

    stopCamera();
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
    setError(null);
    setFlashKey((key) => key + 1);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setPhase("uploading");
    setUploadPercent(0);
    setError(null);

    try {
      // Kompres dulu: model hanya butuh 224x224, tidak perlu mengirim 5 MB.
      const uploadFile = await compressImageForUpload(selectedFile);

      const result = await predictTomatoWithProgress(uploadFile, (percent) => {
        setUploadPercent(percent);
        if (percent >= 100) setPhase("analyzing");
      });

      const thumbnail = await createThumbnail(previewUrl ?? "");
      saveDetectionResult(result, thumbnail, selectedFile.name);
      router.push("/hasil");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(
          err.status === 422 || err.status === 413 || err.status === 415 || err.status === 400
            ? buildGuardError(err)
            : buildTransportError(err)
        );
        return;
      }

      // Error tak terduga (bukan dari API): jangan diam-diam memberi hasil.
      console.error("Gagal memproses foto:", err);
      setError({
        title: "Terjadi kesalahan",
        message:
          err instanceof Error ? err.message : "Gagal memproses gambar.",
        hints: ["Coba unggah ulang foto."],
        allowLocalFallback: true,
      });
    } finally {
      setPhase("idle");
      setUploadPercent(0);
    }
  };

  /**
   * Fallback analisis warna lokal — HANYA lewat pilihan eksplisit pengguna.
   *
   * Sebelumnya jalur ini berjalan otomatis saat backend mati, sehingga
   * pengguna bisa melihat "hasil" yang sebenarnya bukan output MobileNetV2.
   */
  const handleLocalFallback = async () => {
    if (!previewUrl || !selectedFile) return;

    setPhase("analyzing");
    setError(null);
    try {
      const clientResult = await analyzeTomatoClientSide(previewUrl);
      const thumbnail = await createThumbnail(previewUrl);
      saveDetectionResult(clientResult, thumbnail, selectedFile.name, "heuristic");
      router.push("/hasil");
    } catch (clientErr) {
      console.error("Gagal analisis citra lokal:", clientErr);
      setError({
        title: "Analisis lokal gagal",
        message:
          clientErr instanceof Error
            ? clientErr.message
            : "Citra tidak dapat dianalisis di browser.",
        hints: ["Gunakan foto lain dengan latar lebih polos."],
        allowLocalFallback: false,
      });
    } finally {
      setPhase("idle");
    }
  };

  const busyLabel =
    phase === "uploading"
      ? `Mengunggah foto… ${uploadPercent}%`
      : "Menganalisis foto di server…";

  return (
    <div className="space-y-5">
      {/* Input File Asli (Hidden tetapi terhubung secara NATIVE via <label htmlFor="...">) */}
      <input
        id="tomato-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          handleFileChange(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        id="tomato-camera-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          handleFileChange(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Area Utama Dropzone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        animate={{ scale: isDragOver && !reduceMotion ? 1.012 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-300 ${
          isDragOver
            ? "border-brand-primary bg-mentah-bg"
            : previewUrl || isCameraActive
              ? "border-neutral-200 bg-white"
              : "border-neutral-300 bg-white hover:border-brand-primary/60 hover:bg-neutral-50/50"
        }`}
      >
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-mentah-bg/85 text-sm font-semibold text-brand-primary"
            >
              Lepaskan foto di sini
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {isCameraActive ? (
            /* Kamera Live Stream */
            <motion.div
              key="camera"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="relative mx-auto aspect-4/3 max-w-sm overflow-hidden rounded-xl border border-neutral-300 bg-black shadow-inner">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch((err) => console.warn("Video play error:", err));
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-brand-red/90 px-2.5 py-0.5 text-[11px] font-medium text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  <span>Kamera Aktif</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-primary-hover"
                >
                  Ambil Foto Tomat
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          ) : previewUrl ? (
            /* Pratinjau Foto Terpilih */
            <motion.div
              key="preview"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="relative mx-auto aspect-4/3 max-w-sm overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Pratinjau tomat yang dipilih"
                  className="h-full w-full object-contain"
                />

                {/* Kilatan putih saat foto kamera diambil. */}
                <AnimatePresence>
                  {flashKey > 0 && (
                    <motion.div
                      key={flashKey}
                      initial={{ opacity: reduceMotion ? 0 : 0.9 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="pointer-events-none absolute inset-0 bg-white"
                    />
                  )}
                </AnimatePresence>

                {isLoading && <ScanOverlay label={busyLabel} />}
              </div>

              <div className="flex flex-col items-center justify-center gap-1 text-xs text-neutral-600">
                <span className="max-w-xs truncate font-semibold text-neutral-800">
                  {selectedFile?.name || "Foto Tomat"}
                </span>
                <span>
                  {selectedFile
                    ? (selectedFile.size / (1024 * 1024)).toFixed(2)
                    : "0"}{" "}
                  MB
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Spinner />
                      <span>{busyLabel}</span>
                    </>
                  ) : (
                    <span>Klasifikasikan Tingkat Kematangan</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                >
                  Ganti Foto
                </button>
              </div>

              <p role="status" aria-live="polite" className="text-xs text-neutral-600">
                {isLoading ? busyLabel : ""}
              </p>
            </motion.div>
          ) : (
            /* Tampilan Awal Upload */
            <motion.div
              key="empty"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 py-6"
            >
              <div>
                <p className="text-base font-bold text-neutral-800">
                  Pilih atau seret foto tomat ke sini
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  Mendukung format JPG, PNG, atau WebP (maksimal 5 MB)
                </p>
              </div>

              {/* Tombol Native dengan <label htmlFor="..."> */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <label
                  htmlFor="tomato-file-input"
                  className="inline-flex cursor-pointer select-none items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-primary-hover"
                >
                  Pilih Foto dari Perangkat
                </label>

                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
                >
                  Buka Kamera
                </button>
              </div>

              {/* Tombol Uji Langsung dengan Sampel Tomat */}
              <div className="border-t border-neutral-100 pt-4">
                <p className="mb-2 text-xs font-medium text-neutral-600">
                  Atau coba dengan sampel ilustrasi (bukan foto asli):
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {samples.map((sample) => (
                    <motion.button
                      key={sample.type}
                      type="button"
                      whileHover={reduceMotion ? undefined : { y: -2 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                      onClick={() => handleSelectSample(sample.type)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${sample.dot}`}
                      />
                      {sample.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Panel error / penolakan guard */}
      <AnimatePresence>
        {error && (
          <motion.div
            key={`${error.title}-${error.message}`}
            role="alert"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
          >
            <p className="font-semibold">{error.title}</p>
            <p className="mt-1 leading-relaxed">{error.message}</p>

            {error.metric && (
              <p className="mt-2 font-mono text-[11px] text-amber-800">
                {error.metric.label}: {error.metric.value.toFixed(2)}
                {typeof error.metric.threshold === "number" &&
                  ` (ambang: ${error.metric.threshold.toFixed(2)})`}
              </p>
            )}

            {error.hints.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-0.5 leading-relaxed">
                {error.hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {error.allowLocalFallback && previewUrl && (
                <button
                  type="button"
                  onClick={handleLocalFallback}
                  disabled={isLoading}
                  className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
                >
                  Analisis warna lokal (tanpa AI)
                </button>
              )}
              <button
                type="button"
                onClick={() => setError(null)}
                className="cursor-pointer rounded-lg px-2 py-1.5 font-medium text-amber-800 transition-colors hover:bg-amber-100"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips Panduan */}
      <div className="space-y-1 rounded-xl border border-neutral-200/70 bg-white p-4 text-xs text-neutral-600">
        <p className="font-semibold text-neutral-700">
          Tips untuk Hasil Akurasi Terbaik
        </p>
        <ul className="list-inside list-disc space-y-0.5 text-xs text-neutral-600">
          <li>
            Gunakan tomat yang sudah dipetik (post-harvest) di atas meja atau
            piring.
          </li>
          <li>
            Pastikan latar belakang cukup polos dan kontras agar segmentasi objek
            tomat optimal.
          </li>
          <li>
            Pencahayaan terang merata tanpa bayangan ekstrem yang menutupi
            permukaan tomat.
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Spinner kecil dengan animasi berputar. */
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/**
 * Overlay "sedang menganalisis": garis pemindai bergerak di atas foto.
 *
 * Memberi umpan balik visual bahwa foto sedang diproses server, bukan macet.
 */
function ScanOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-neutral-900/55">
      <div className="absolute inset-x-0 top-0 h-1/3 animate-scanline border-b-2 border-brand-primary/80 bg-gradient-to-b from-transparent via-brand-primary/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-white">
        <Spinner />
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[11px] text-white/80">MobileNetV2 + Segmentasi HSV</p>
      </div>
    </div>
  );
}
