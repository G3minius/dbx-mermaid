import {
  SPLIT_DEFAULT_RATIO,
  SPLIT_GUTTER_PX,
  SPLIT_KEYBOARD_STEP,
  SPLIT_MAX_RATIO,
  SPLIT_MIN_RATIO
} from "./constants";

/** `side-by-side` = vertical divider on wide screens; `stacked` = horizontal divider. */
export type SplitOrientation = "side-by-side" | "stacked";

/**
 * Translate a pointer coordinate into the fraction taken by the editor pane.
 * `containerStart` is the container's left (columns) or top (rows) edge.
 */
export function ratioFromPointer(
  clientPos: number,
  containerStart: number,
  containerSize: number
): number {
  if (!Number.isFinite(clientPos) || !Number.isFinite(containerStart)) {
    return SPLIT_DEFAULT_RATIO;
  }
  if (!Number.isFinite(containerSize) || containerSize <= 0) {
    return SPLIT_DEFAULT_RATIO;
  }
  return (clientPos - containerStart) / containerSize;
}

/**
 * Keep both panes usable: hard ratio limits first, then a pixel minimum on
 * each side. A container too small for two minima degrades to an even split.
 */
export function clampSplitRatio(
  ratio: number,
  containerSize: number,
  minPane: number,
  gutter = SPLIT_GUTTER_PX
): number {
  const base = Number.isFinite(ratio) ? ratio : SPLIT_DEFAULT_RATIO;
  const bounded = Math.min(SPLIT_MAX_RATIO, Math.max(SPLIT_MIN_RATIO, base));
  if (!Number.isFinite(containerSize) || containerSize <= 0) {
    return bounded;
  }
  const usable = Math.max(0, containerSize - gutter);
  const edge = (minPane + gutter / 2) / Math.max(1, usable);
  if (edge >= 0.5) {
    return 0.5;
  }
  return Math.min(1 - edge, Math.max(edge, bounded));
}

/** Keyboard equivalent of dragging: `steps` is negative for left/up. */
export function stepSplitRatio(
  ratio: number,
  steps: number,
  containerSize: number,
  minPane: number,
  step = SPLIT_KEYBOARD_STEP,
  gutter = SPLIT_GUTTER_PX
): number {
  const delta = Number.isFinite(steps) ? steps * step : 0;
  return clampSplitRatio(ratio + delta, containerSize, minPane, gutter);
}
