import { PNG_MAX_PIXELS, PNG_MAX_SIDE, PNG_SCALE } from "./constants";

export interface RasterSize {
  width: number;
  height: number;
  /** Effective scale after the memory/size caps were applied. */
  scale: number;
}

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Pure sizing helper. The 2x default keeps text crisp, but a huge Mermaid
 * diagram must never allocate an unbounded canvas: both the longest side and
 * the total pixel count are capped by shrinking the effective scale.
 */
export function computeRasterSize(
  naturalWidth: number,
  naturalHeight: number,
  scale = PNG_SCALE,
  maxSide = PNG_MAX_SIDE,
  maxPixels = PNG_MAX_PIXELS
): RasterSize {
  const baseWidth = positive(naturalWidth, 800);
  const baseHeight = positive(naturalHeight, 600);
  const sideCap = positive(maxSide, PNG_MAX_SIDE);
  const pixelCap = positive(maxPixels, PNG_MAX_PIXELS);
  const requested = Math.min(4, Math.max(0.5, positive(scale, PNG_SCALE)));

  // Solve both caps for the scale itself, then floor the pixel dimensions so
  // rounding can never push the canvas back over a limit.
  const effective = Math.max(
    0.05,
    Math.min(
      requested,
      sideCap / Math.max(baseWidth, baseHeight),
      Math.sqrt(pixelCap / (baseWidth * baseHeight))
    )
  );

  return {
    width: Math.max(1, Math.floor(baseWidth * effective)),
    height: Math.max(1, Math.floor(baseHeight * effective)),
    scale: effective
  };
}

/** Pure: percent-encode XML so a data URL never depends on base64/Unicode quirks. */
export function buildSvgDataUrl(xml: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

interface SvgImageSource {
  image: CanvasImageSource;
  release(): void;
}

function loadImage(url: string, release: () => void): Promise<SvgImageSource | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ image, release });
    image.onerror = () => {
      release();
      resolve(null);
    };
    image.src = url;
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Decode the sanitized SVG into something `drawImage` accepts.
 *
 * DBX hosts differ: some allow `img-src data:`, some only `blob:`, and a
 * sandboxed opaque-origin WebView may block both. `createImageBitmap` is the
 * last resort because it decodes a Blob without an `img-src` fetch. The SVG
 * itself is already DOMPurify-sanitized and asserted to contain no external
 * references, so none of these paths can trigger a network request.
 */
async function loadSvgSource(xml: string): Promise<SvgImageSource> {
  const fromData = await loadImage(buildSvgDataUrl(xml), () => undefined);
  if (fromData !== null) {
    return fromData;
  }

  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(blob);
      const fromBlob = await loadImage(objectUrl, () => {
        if (objectUrl !== null) {
          URL.revokeObjectURL(objectUrl);
        }
      });
      if (fromBlob !== null) {
        return fromBlob;
      }
    } catch {
      // An opaque-origin sandbox may refuse blob URLs; try decode-only next.
      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      return { image: bitmap, release: () => bitmap.close() };
    } catch {
      // Chromium builds without SVG support in createImageBitmap land here.
    }
  }

  throw new Error("the host blocked SVG image decoding");
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  if (typeof canvas.toBlob === "function") {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob === null) {
          reject(new Error("PNG encoding returned no data"));
          return;
        }
        blob.arrayBuffer().then(
          (buffer) => resolve(new Uint8Array(buffer)),
          (error: unknown) => reject(new Error(errorMessage(error)))
        );
      }, "image/png");
    });
  }

  // Older WebView2 builds may lack toBlob; toDataURL is a synchronous fallback.
  const dataUrl = canvas.toDataURL("image/png");
  const comma = dataUrl.indexOf(",");
  if (comma < 0) {
    return Promise.reject(new Error("PNG encoding returned no data"));
  }
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return Promise.resolve(bytes);
}

/**
 * Rasterize a serialized, sanitized SVG into PNG bytes. `background` is an
 * opaque colour constant chosen from the active preview theme, so dark
 * diagrams stay readable instead of ending up with a transparent/white PNG.
 */
export async function rasterizePng(
  xml: string,
  size: RasterSize,
  background: string
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("the host has no 2D canvas context");
  }

  const source = await loadSvgSource(xml);
  try {
    context.fillStyle = background;
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(source.image, 0, 0, size.width, size.height);
  } catch (error) {
    throw new Error(`SVG drawing failed: ${errorMessage(error)}`);
  } finally {
    source.release();
  }

  try {
    return await canvasToPngBytes(canvas);
  } catch (error) {
    // Typically SecurityError from an origin-tainted canvas in a sandboxed host.
    throw new Error(`PNG encoding failed: ${errorMessage(error)}`);
  } finally {
    // Release the backing store promptly for large diagrams.
    canvas.width = 0;
    canvas.height = 0;
  }
}
