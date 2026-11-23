import { describe, expect, it } from "vitest";
import { buildPngFileName, buildSvgFileName } from "./export";

describe("buildSvgFileName", () => {
  it("formats a local timestamp", () => {
    expect(buildSvgFileName(new Date(2026, 10, 8, 9, 5, 7))).toBe("mermaid-20261108-090507.svg");
  });

  it("pads month, day and time parts", () => {
    expect(buildSvgFileName(new Date(2026, 0, 2, 3, 4, 5))).toBe("mermaid-20260102-030405.svg");
  });
});

describe("buildPngFileName", () => {
  it("shares the timestamp format but uses a .png extension", () => {
    const date = new Date(2026, 10, 8, 9, 5, 7);
    expect(buildPngFileName(date)).toBe("mermaid-20261108-090507.png");
    expect(buildPngFileName(date)).toBe(buildSvgFileName(date).replace(/\.svg$/, ".png"));
  });
});
