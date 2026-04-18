/**
 * imageUpload — shared helper for turning a user-selected image File into a
 * JPEG data-URL (base64) that's safe to send to Gemini/Claude.
 *
 * Resizes the image client-side so we don't ship 4-8 MB base64 payloads
 * (phones easily produce 12 MP images that OOM the AI call).
 */

export interface ResizeOptions {
  /** Longest edge in pixels after resize. Default 1600. */
  maxDim?: number;
  /** JPEG quality 0-1. Default 0.82. */
  quality?: number;
}

/**
 * Reads a single image File, downscales it so the longest edge <= maxDim,
 * and returns a data-URL like "data:image/jpeg;base64,...".
 *
 * Throws if the file isn't an image or the browser fails to decode it.
 */
export function fileToResizedDataUrl(
  file: File,
  { maxDim = 1600, quality = 0.82 }: ResizeOptions = {}
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Filen er ikke et bilde.'));
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Kunne ikke lese filen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Kunne ikke dekode bildet.'));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas-kontekst ikke tilgjengelig.'));
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Reads multiple image Files in parallel, filters out failures (logging them
 * to console), and returns only the data-URLs that succeeded.
 */
export async function filesToResizedDataUrls(
  files: FileList | File[],
  opts?: ResizeOptions
): Promise<string[]> {
  const arr = Array.from(files);
  const results = await Promise.allSettled(arr.map(f => fileToResizedDataUrl(f, opts)));
  const out: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      out.push(r.value);
    } else {
      console.warn(`[imageUpload] Skipped ${arr[i].name}:`, r.reason);
    }
  });
  return out;
}
