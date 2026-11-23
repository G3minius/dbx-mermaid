import { describe, expect, it } from "vitest";
import {
  anchoredScrollDelta,
  clampZoom,
  formatZoom,
  horizontalWheelDelta,
  normalizeWheelDelta,
  panDelta,
  wheelZoomFactor,
  zoomFactorFromPixels
} from "./canvasMath";
import {
  WHEEL_LINE_HEIGHT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_WHEEL_FACTOR_MAX,
  ZOOM_WHEEL_FACTOR_MIN
} from "./constants";

describe("normalizeWheelDelta", () => {
  it("passes pixel deltas through and scales line/page deltas", () => {
    expect(normalizeWheelDelta(120, 0, 600)).toBe(120);
    expect(normalizeWheelDelta(-3, 1, 600)).toBe(-3 * WHEEL_LINE_HEIGHT);
    expect(normalizeWheelDelta(2, 2, 600)).toBe(1200);
  });

  it("treats unknown delta modes as pixels and guards bad input", () => {
    expect(normalizeWheelDelta(48, 9, 600)).toBe(48);
    expect(normalizeWheelDelta(Number.NaN, 0, 600)).toBe(0);
    expect(normalizeWheelDelta(1, 2, 0)).toBe(1);
    expect(normalizeWheelDelta(1, 2, Number.NaN)).toBe(1);
  });
});

describe("wheelZoomFactor", () => {
  it("zooms in on negative deltas, out on positive ones, and is stable at zero", () => {
    expect(wheelZoomFactor(0)).toBe(1);
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(-100) * wheelZoomFactor(100)).toBeCloseTo(1, 6);
  });

  it("clamps a single event to a safe factor range", () => {
    expect(wheelZoomFactor(-100_000)).toBe(ZOOM_WHEEL_FACTOR_MAX);
    expect(wheelZoomFactor(100_000)).toBe(ZOOM_WHEEL_FACTOR_MIN);
    expect(wheelZoomFactor(-1, 2, 600)).toBe(ZOOM_WHEEL_FACTOR_MAX);
  });

  it("handles pinch-sized line deltas and non-finite input", () => {
    const pinch = wheelZoomFactor(-2, 1, 600);
    expect(pinch).toBeGreaterThan(1);
    expect(pinch).toBeLessThan(ZOOM_WHEEL_FACTOR_MAX);
    expect(wheelZoomFactor(Number.POSITIVE_INFINITY, 0, 600)).toBe(1);
  });
});

describe("zoomFactorFromPixels", () => {
  it("matches wheelZoomFactor for pixel deltas and guards bad input", () => {
    expect(zoomFactorFromPixels(-100)).toBe(wheelZoomFactor(-100));
    expect(zoomFactorFromPixels(Number.NaN)).toBe(1);
    expect(zoomFactorFromPixels(Number.POSITIVE_INFINITY)).toBe(1);
    expect(zoomFactorFromPixels(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});

describe("clampZoom", () => {
  it("keeps 10%-400% and falls back to 100% for invalid values", () => {
    expect(clampZoom(1.456)).toBe(1.456);
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
    expect(clampZoom(99)).toBe(ZOOM_MAX);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(ZOOM_MAX);
  });
});

describe("anchoredScrollDelta", () => {
  it("keeps the pointer over the same diagram point after zooming", () => {
    const delta = anchoredScrollDelta(
      { left: 0, top: 0 },
      { left: -50, top: 0 },
      { x: 100, y: 100 },
      1,
      2
    );
    expect(delta).toEqual({ x: 50, y: 100 });
  });

  it("returns zero when nothing moves", () => {
    const rect = { left: 10, top: 20 };
    expect(anchoredScrollDelta(rect, rect, { x: 110, y: 120 }, 1, 1)).toEqual({ x: 0, y: 0 });
  });

  it("absorbs a centered-stage layout shift", () => {
    const delta = anchoredScrollDelta(
      { left: 0, top: 0 },
      { left: 40, top: 0 },
      { x: 100, y: 50 },
      1,
      1.5
    );
    expect(delta).toEqual({ x: 90, y: 25 });
  });

  it("guards against an invalid previous zoom", () => {
    expect(
      anchoredScrollDelta({ left: 0, top: 0 }, { left: 0, top: 0 }, { x: 10, y: 10 }, 0, 2)
    ).toEqual({ x: 0, y: 0 });
  });
});

describe("panDelta", () => {
  it("moves one step per direction", () => {
    expect(panDelta("up")).toEqual({ x: 0, y: -64 });
    expect(panDelta("down")).toEqual({ x: 0, y: 64 });
    expect(panDelta("left")).toEqual({ x: -64, y: 0 });
    expect(panDelta("right")).toEqual({ x: 64, y: 0 });
  });

  it("accepts a custom step and ignores a non-finite one", () => {
    expect(panDelta("left", 40)).toEqual({ x: -40, y: 0 });
    expect(panDelta("right", Number.NaN)).toEqual({ x: 64, y: 0 });
  });
});

describe("horizontalWheelDelta", () => {
  it("prefers deltaX and falls back to deltaY for shift+wheel", () => {
    expect(horizontalWheelDelta(80, 0, 0, 600)).toBe(80);
    expect(horizontalWheelDelta(0, -120, 0, 600)).toBe(-120);
    expect(horizontalWheelDelta(0, -2, 1, 600)).toBe(-2 * WHEEL_LINE_HEIGHT);
    expect(horizontalWheelDelta(0, 0, 0, 600)).toBe(0);
  });
});

describe("formatZoom", () => {
  it("rounds to whole percent and guards invalid values", () => {
    expect(formatZoom(1)).toBe("100%");
    expect(formatZoom(1.456)).toBe("146%");
    expect(formatZoom(ZOOM_MAX)).toBe("400%");
    expect(formatZoom(Number.NaN)).toBe("100%");
  });
});
