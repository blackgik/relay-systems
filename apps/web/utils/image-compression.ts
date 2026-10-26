'use client';

export interface ImageCompressionOptions {
  /** Longest-edge cap in pixels. The aspect ratio is always preserved. */
  maxDimension?: number;
  /** Target file size. Quality is stepped down until the output fits (or bottoms out). */
  maxSizeMb?: number;
  /** Starting JPEG/WebP quality, 0–1. */
  quality?: number;
}

const DEFAULTS: Required<ImageCompressionOptions> = {
  maxDimension: 1600,
  maxSizeMb: 1,
  quality: 0.82,
};

/** Formats a browser upload straight off a phone camera are typically 4–12MB. */
const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const canCompress = (file: File) =>
  typeof window !== 'undefined' &&
  typeof HTMLCanvasElement !== 'undefined' &&
  COMPRESSIBLE_TYPES.includes(file.type.toLowerCase());

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode image'));
    };
    img.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Downscales and re-encodes an image in the browser so large camera/scanner
 * uploads fit under the upload size limit instead of being rejected outright.
 *
 * Always fails soft: anything it can't handle (SVG, GIF, a decode error, a
 * result that came out bigger than the original) returns the original file
 * untouched, so the caller's own validation stays the single gate.
 */
export const compressImageFile = async (
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> => {
  const { maxDimension, maxSizeMb, quality } = { ...DEFAULTS, ...options };
  const maxBytes = maxSizeMb * 1024 * 1024;

  if (!canCompress(file)) return file;
  // Already small and within bounds — re-encoding would only lose detail.
  if (file.size < maxBytes * 0.9) return file;

  try {
    const img = await loadImage(file);
    const largestEdge = Math.max(img.width, img.height);
    const scale = largestEdge > maxDimension ? maxDimension / largestEdge : 1;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // PNGs are re-encoded as JPEG — canvas ignores the quality argument for
    // PNG, so keeping the type would leave the file just as large.
    const outputType = 'image/jpeg';

    let currentQuality = quality;
    let blob = await canvasToBlob(canvas, outputType, currentQuality);

    // Step the quality down until it fits; 0.4 is the floor where artefacts
    // start being obvious on product photos.
    while (blob && blob.size > maxBytes && currentQuality > 0.4) {
      currentQuality -= 0.12;
      blob = await canvasToBlob(canvas, outputType, currentQuality);
    }

    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  }
};

/**
 * Shrinks an image so its longest edge is at most `maxDimension`, keeping the
 * format — so a PNG or WebP logo keeps its transparency, unlike
 * `compressImageFile`, which re-encodes to JPEG to hit a size budget.
 *
 * Fails soft like `compressImageFile`: SVG, GIF, decode errors and images that
 * are already small enough come back untouched.
 */
export const resizeImageToFit = async (file: File, maxDimension = 512): Promise<File> => {
  if (!canCompress(file)) return file;

  try {
    const img = await loadImage(file);
    const largestEdge = Math.max(img.width, img.height);
    if (largestEdge <= maxDimension) return file;

    const scale = maxDimension / largestEdge;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const keepsAlpha = file.type === 'image/png' || file.type === 'image/webp';
    const outputType = keepsAlpha ? file.type : 'image/jpeg';
    const blob = await canvasToBlob(canvas, outputType, 0.9);
    if (!blob) return file;

    const extension = outputType.split('/')[1].replace('jpeg', 'jpg');
    const name = file.name.replace(/\.[^.]+$/, '') + '.' + extension;
    return new File([blob], name, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  }
};

export function processFileToDataURL(
  file: File | undefined,
  successCallback: (result: string | ArrayBuffer | null) => void
) {
  if (!file) {
    successCallback(null);
    return;
  }

  const reader = new FileReader();

  reader.onloadend = function () {
    const result = reader.result;
    successCallback(result);
  };

  reader.readAsDataURL(file);
}
