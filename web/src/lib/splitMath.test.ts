import { describe, expect, it } from "vitest";
import { SPLIT_DEFAULT_RATIO, SPLIT_GUTTER_PX, SPLIT_MIN_PANE_PX } from "./constants";
import { clampSplitRatio, ratioFromPointer, stepSplitRatio } from "./splitMath";

describe("ratioFromPointer", () => {
  it("maps a viewport coordinate onto the editor fraction", () => {
    expect(ratioFromPointer(480, 40, 1000)).toBe(0.44);
    expect(ratioFromPointer(40, 40, 1000)).toBe(0);
    expect(ratioFromPointer(1040, 40, 1000)).toBe(1);
  });

  it("falls back to the default when geometry is unusable", () => {
    expect(ratioFromPointer(100, 0, 0)).toBe(SPLIT_DEFAULT_RATIO);
    expect(ratioFromPointer(100, 0, Number.NaN)).toBe(SPLIT_DEFAULT_RATIO);
    expect(ratioFromPointer(Number.NaN, 0, 1000)).toBe(SPLIT_DEFAULT_RATIO);
  });
});

describe("clampSplitRatio", () => {
  it("keeps the default ratio inside a comfortable container", () => {
    expect(clampSplitRatio(0.44, 1200, SPLIT_MIN_PANE_PX, SPLIT_GUTTER_PX)).toBe(0.44);
  });

  it("enforces a pixel minimum on both sides", () => {
    const low = clampSplitRatio(0, 1200, SPLIT_MIN_PANE_PX, SPLIT_GUTTER_PX);
    const high = clampSplitRatio(1, 1200, SPLIT_MIN_PANE_PX, SPLIT_GUTTER_PX);
    expect(low).toBeGreaterThan(0.18);
    expect(low).toBeLessThan(0.2);
    expect(high).toBeCloseTo(1 - low, 10);
  });

  it("respects the hard 15/85 limits on very wide containers", () => {
    expect(clampSplitRatio(0.02, 10_000, SPLIT_MIN_PANE_PX, SPLIT_GUTTER_PX)).toBe(0.15);
    expect(clampSplitRatio(0.98, 10_000, SPLIT_MIN_PANE_PX, SPLIT_GUTTER_PX)).toBe(0.85);
  });

  it("splits evenly when the container cannot fit two minima", () => {
    expect(clampSplitRatio(0.2, 300, SPLIT_MIN_PANE_PX, SPLIT_GUTTER_PX)).toBe(0.5);
    expect(clampSplitRatio(0.9, 300, SPLIT_MIN_PANE_PX, SPLIT_GUTTER_PX)).toBe(0.5);
  });

  it("falls back to the default for non-finite inputs", () => {
    expect(clampSplitRatio(Number.NaN, 1200, SPLIT_MIN_PANE_PX, SPLIT_GUTTER_PX)).toBe(
      SPLIT_DEFAULT_RATIO
    );
    expect(clampSplitRatio(0.44, Number.NaN, SPLIT_MIN_PANE_PX, SPLIT_GUTTER_PX)).toBe(0.44);
  });
});

describe("stepSplitRatio", () => {
  it("steps in both directions and clamps at the edges", () => {
    expect(stepSplitRatio(0.44, 1, 1200, SPLIT_MIN_PANE_PX, 0.02, SPLIT_GUTTER_PX)).toBeCloseTo(
      0.46,
      10
    );
    expect(stepSplitRatio(0.44, -1, 1200, SPLIT_MIN_PANE_PX, 0.02, SPLIT_GUTTER_PX)).toBeCloseTo(
      0.42,
      10
    );
    const floor = stepSplitRatio(0.19, -1, 1200, SPLIT_MIN_PANE_PX, 0.1, SPLIT_GUTTER_PX);
    expect(floor).toBeGreaterThan(0.18);
    expect(floor).toBeLessThan(0.2);
  });

  it("ignores a non-finite step count", () => {
    expect(stepSplitRatio(0.44, Number.NaN, 1200, SPLIT_MIN_PANE_PX, 0.02, SPLIT_GUTTER_PX)).toBe(
      0.44
    );
  });
});
