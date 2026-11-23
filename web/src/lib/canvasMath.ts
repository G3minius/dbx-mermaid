import {
  PAN_STEP,
  WHEEL_LINE_HEIGHT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_WHEEL_FACTOR_MAX,
  ZOOM_WHEEL_FACTOR_MIN,
  ZOOM_WHEEL_SENSITIVITY
} from "./constants";

export type PanDirection = "up" | "down" | "left" | "right";

export interface Point {
  x: number;
  y: number;
}

/** The subset of DOMRect / getBoundingClientRect() the zoom anchor needs. */
export interface RectOrigin {
  left: number;
  top: number;
}

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert a WheelEvent delta to CSS pixels.
 * deltaMode: 0 = pixel, 1 = line, 2 = page; unknown modes fall back to pixels.
 */
export function normalizeWheelDelta(
  delta: number,
  deltaMode: number,
  viewportHeight: number
): number {
  const value = finite(delta, 0);
  if (deltaMode === 1) {
    return value * WHEEL_LINE_HEIGHT;
  }
  if (deltaMode === 2) {
    return value * Math.max(1, finite(viewportHeight, 1));
  }
  return value;
}

/** Multiplicative zoom factor for a normalized pixel delta; 1 means "no change". */
export function zoomFactorFromPixels(pixels: number): number {
  const raw = Math.exp(-finite(pixels, 0) * ZOOM_WHEEL_SENSITIVITY);
  return clamp(raw, ZOOM_WHEEL_FACTOR_MIN, ZOOM_WHEEL_FACTOR_MAX);
}

/** Multiplicative zoom factor for one wheel event; 1 means "no change". */
export function wheelZoomFactor(
  deltaY: number,
  deltaMode = 0,
  viewportHeight = 600
): number {
  return zoomFactorFromPixels(normalizeWheelDelta(deltaY, deltaMode, viewportHeight));
}

export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) {
    return 1;
  }
  return clamp(zoom, ZOOM_MIN, ZOOM_MAX);
}

/**
 * Scroll compensation that keeps the diagram point under the pointer fixed on
 * screen after a zoom. `before` / `after` are SVG bounding rect origins read on
 * either side of the DOM resize, so a centered-stage layout change is absorbed.
 */
export function anchoredScrollDelta(
  before: RectOrigin,
  after: RectOrigin,
  anchor: Point,
  zoomBefore: number,
  zoomAfter: number
): Point {
  if (!Number.isFinite(zoomBefore) || zoomBefore <= 0 || !Number.isFinite(zoomAfter)) {
    return { x: 0, y: 0 };
  }
  const imageX = (anchor.x - before.left) / zoomBefore;
  const imageY = (anchor.y - before.top) / zoomBefore;
  return {
    x: after.left + imageX * zoomAfter - anchor.x,
    y: after.top + imageY * zoomAfter - anchor.y
  };
}

/** A single click/tap on a directional control moves the viewport by one step. */
export function panDelta(direction: PanDirection, step = PAN_STEP): Point {
  const distance = finite(step, PAN_STEP);
  switch (direction) {
    case "up":
      return { x: 0, y: -distance };
    case "down":
      return { x: 0, y: distance };
    case "left":
      return { x: -distance, y: 0 };
    case "right":
      return { x: distance, y: 0 };
  }
}

/**
 * Shift+wheel pans horizontally. Some browsers report the shift gesture in
 * deltaY instead of deltaX, so prefer deltaX and fall back to deltaY.
 */
export function horizontalWheelDelta(
  deltaX: number,
  deltaY: number,
  deltaMode: number,
  viewportHeight: number
): number {
  const x = normalizeWheelDelta(deltaX, deltaMode, viewportHeight);
  if (x !== 0) {
    return x;
  }
  return normalizeWheelDelta(deltaY, deltaMode, viewportHeight);
}

export function formatZoom(zoom: number): string {
  return `${Math.round(finite(zoom, 1) * 100)}%`;
}
