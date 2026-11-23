import { describe, expect, it } from "vitest";
import { PNG_MAX_PIXELS, PNG_MAX_SIDE, PNG_SCALE } from "./constants";
import { buildSvgDataUrl, computeRasterSize } from "./raster";

describe("computeRasterSize", () => {
  it("uses a 2x scale for an ordinary diagram", () => {
    expect(computeRasterSize(800, 600)).toEqual({ width: 1600, height: 1200, scale: PNG_SCALE });
  });

  it("honours an explicit scale", () => {
    expect(computeRasterSize(200, 100, 3)).toMatchObject({ width: 600, height: 300, scale: 3 });
  });

  it("caps the longest side and the total pixel count", () => {
    const size = computeRasterSize(6000, 4000);
    expect(size.width).toBeLessThanOrEqual(PNG_MAX_SIDE);
    expect(size.height).toBeLessThanOrEqual(PNG_MAX_SIDE);
    expect(size.width * size.height).toBeLessThanOrEqual(PNG_MAX_PIXELS);
    expect(size.scale).toBeLessThan(PNG_SCALE);
  });

  it("caps a wide-but-short diagram by total pixels", () => {
    const size = computeRasterSize(4000, 100, 3);
    expect(size.width * size.height).toBeLessThanOrEqual(PNG_MAX_PIXELS);
    expect(size.scale).toBeLessThan(3);
  });

  it("keeps absurd natural sizes finite and positive", () => {
    const size = computeRasterSize(Number.POSITIVE_INFINITY, -10, Number.NaN);
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
    expect(Number.isFinite(size.scale)).toBe(true);
  });

  it("never returns a degenerate canvas", () => {
    const size = computeRasterSize(1, 1, 0.0001);
    expect(size.width).toBeGreaterThanOrEqual(1);
    expect(size.height).toBeGreaterThanOrEqual(1);
  });
});

describe("buildSvgDataUrl", () => {
  it("percent-encodes XML without base64", () => {
    const url = buildSvgDataUrl('<svg a="1&2"><text>#x</text></svg>');
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(url).toContain("1%262");
    expect(url).toContain("%23x");
    expect(url).not.toContain("base64");
  });

  it("encodes non-ASCII labels safely", () => {
    const url = buildSvgDataUrl("<svg>流程图</svg>");
    expect(url).toBe(`data:image/svg+xml;charset=utf-8,${encodeURIComponent("<svg>流程图</svg>")}`);
  });
});
