import { canCopy, canSaveFile, copyText, getFileTransfer } from "./dbx";
import { PNG_SCALE } from "./constants";
import { getSvgViewBoxSize } from "./dom";
import { computeRasterSize, rasterizePng } from "./raster";

export type SaveOutcome = "saved" | "canceled" | "copied";

export interface PngSaveOptions {
  /** Opaque colour constant resolved from the active preview theme. */
  background: string;
  scale?: number;
}

/** PNG has one extra fallback: when rasterization is blocked, copy the SVG source. */
export type PngSaveResult =
  | { kind: "saved" }
  | { kind: "canceled" }
  | { kind: "copiedSvg"; reason: "no-save" | "raster-failed" };

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

function buildExportFileName(date: Date, extension: "svg" | "png"): string {
  return `mermaid-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}.${extension}`;
}

export function buildSvgFileName(date: Date): string {
  return buildExportFileName(date, "svg");
}

export function buildPngFileName(date: Date): string {
  return buildExportFileName(date, "png");
}

/**
 * Clone the displayed SVG and restore a natural intrinsic size. The preview
 * canvas sets width/height inline for zooming; an exported file must not keep
 * those zoom values.
 */
export function serializeSvg(
  svg: SVGSVGElement,
  explicitSize?: { width: number; height: number }
): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const size = explicitSize ?? getSvgViewBoxSize(svg);
  if (size !== null) {
    clone.setAttribute("width", String(size.width));
    clone.setAttribute("height", String(size.height));
  }
  clone.style.removeProperty("width");
  clone.style.removeProperty("height");
  clone.style.removeProperty("max-width");
  clone.style.removeProperty("min-width");

  const xml = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

/** Shared streaming save for both text (SVG) and binary (PNG) payloads. */
async function saveBytesViaFileTransfer(
  bytes: Uint8Array,
  name: string,
  contentType: string
): Promise<SaveOutcome> {
  const transfer = getFileTransfer();
  if (
    transfer === undefined ||
    typeof transfer.beginSave !== "function" ||
    typeof transfer.write !== "function" ||
    typeof transfer.finish !== "function"
  ) {
    throw new Error("fileTransfer became unavailable.");
  }

  const target = await transfer.beginSave({
    name,
    contentType,
    size: bytes.byteLength
  });
  if (target === null) {
    return "canceled";
  }

  const requestedChunk = target.chunkBytes ?? 256 * 1024;
  const chunkBytes = Math.max(16 * 1024, Math.min(requestedChunk, 1024 * 1024));

  try {
    let offset = 0;
    while (offset < bytes.byteLength) {
      const end = Math.min(offset + chunkBytes, bytes.byteLength);
      const result = await transfer.write(target.handleId, offset, bytes.subarray(offset, end));
      const nextOffset =
        typeof result?.nextOffset === "number" && result.nextOffset > offset ? result.nextOffset : end;
      if (nextOffset <= offset) {
        throw new Error("File transfer made no progress.");
      }
      offset = nextOffset;
    }
    await transfer.finish(target.handleId);
    return "saved";
  } catch (error) {
    try {
      await transfer.cancel?.(target.handleId);
    } catch {
      // The original error is more useful than a cancellation failure.
    }
    throw error;
  }
}

export async function saveSvg(svg: SVGSVGElement): Promise<SaveOutcome> {
  const xml = serializeSvg(svg);
  if (canSaveFile()) {
    const bytes = new TextEncoder().encode(xml);
    return saveBytesViaFileTransfer(bytes, buildSvgFileName(new Date()), "image/svg+xml");
  }
  if (!canCopy()) {
    throw new Error("Saving and copying are unavailable in this host.");
  }
  await copyText(xml);
  return "copied";
}

export async function savePng(
  svg: SVGSVGElement,
  options: PngSaveOptions
): Promise<PngSaveResult> {
  const natural = getSvgViewBoxSize(svg) ?? { width: 800, height: 600 };
  // Give the raster decoder an intrinsic size even if a diagram has no viewBox.
  const xml = serializeSvg(svg, natural);

  if (!canSaveFile()) {
    if (!canCopy()) {
      throw new Error("Saving and copying are unavailable in this host.");
    }
    await copyText(xml);
    return { kind: "copiedSvg", reason: "no-save" };
  }

  const size = computeRasterSize(natural.width, natural.height, options.scale ?? PNG_SCALE);
  let bytes: Uint8Array;
  try {
    bytes = await rasterizePng(xml, size, options.background);
  } catch {
    // Some sandboxed hosts block SVG image decoding or taint the canvas.
    // Leave the user with the lossless source instead of a broken PNG.
    if (!canCopy()) {
      throw new Error("PNG rasterization failed and copying is unavailable in this host.");
    }
    await copyText(xml);
    return { kind: "copiedSvg", reason: "raster-failed" };
  }

  const outcome = await saveBytesViaFileTransfer(
    bytes,
    buildPngFileName(new Date()),
    "image/png"
  );
  return outcome === "saved" ? { kind: "saved" } : { kind: "canceled" };
}

export async function copySource(source: string): Promise<void> {
  await copyText(source);
}
