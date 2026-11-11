/**
 * Helper gambar berbasis canvas untuk kebutuhan sisi klien.
 */

/** Ukuran maksimum sisi terpanjang sebelum foto dikirim ke server. */
const UPLOAD_MAX_SIZE = 1024;
const UPLOAD_QUALITY = 0.85;

/** Muat data URL menjadi elemen Image. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

/** Baca File menjadi data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });
}

/**
 * Perkecil foto sebelum diunggah.
 *
 * Model hanya menerima input 224x224, tetapi file asli bisa 5 MB. Mengirim
 * file penuh membuat pengguna di jaringan lambat menunggu lama tanpa manfaat.
 * Sisi terpanjang dibatasi 1024 px (masih jauh di atas kebutuhan segmentasi)
 * dan dikodekan ulang sebagai JPEG kualitas 0.85.
 *
 * Bila hasil kompresi justru lebih besar (mis. PNG kecil), file asli
 * dikembalikan agar tidak ada kerugian.
 */
export async function compressImageForUpload(
  file: File,
  maxSize = UPLOAD_MAX_SIZE
): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  try {
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return file;

    const scale = Math.min(1, maxSize / Math.max(width, height));
    // Sudah cukup kecil: tidak perlu dikodekan ulang.
    if (scale === 1 && file.size < 400 * 1024) return file;

    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", UPLOAD_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.(jpe?g|png|webp)$/i, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/**
 * Perkecil data URL menjadi thumbnail JPEG sebelum disimpan ke storage.
 *
 * Menyimpan foto asli (hingga 5 MB → ~6,7 MB base64) ke localStorage akan
 * cepat menghabiskan kuota. Thumbnail 720 px hanya puluhan KB sehingga
 * riwayat bisa menampung lebih banyak tanpa error quota.
 */
export async function createThumbnail(
  dataUrl: string,
  maxSize = 720
): Promise<string> {
  if (typeof window === "undefined" || !dataUrl) return dataUrl;

  try {
    const img = await loadImage(dataUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return dataUrl;

    const scale = Math.min(1, maxSize / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return dataUrl;
  }
}
