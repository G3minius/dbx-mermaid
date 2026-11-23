import { describe, expect, it } from "vitest";
import { getMessages } from "./i18n";
import {
  DEFAULT_PREVIEW_THEME_ID,
  findPreviewTheme,
  isPreviewThemeId,
  PREVIEW_THEMES,
  previewBackgroundColor,
  resolvePreviewTheme,
  type PreviewThemeId
} from "./themes";

const HEX = /^#[0-9a-f]{6}$/i;
const RGBA = /^rgba\(\s*\d+,\s*\d+,\s*\d+,\s*[\d.]+\s*\)$/;

describe("PREVIEW_THEMES", () => {
  it("starts with the auto theme and has unique ids", () => {
    expect(DEFAULT_PREVIEW_THEME_ID).toBe("auto");
    expect(PREVIEW_THEMES[0].id).toBe("auto");
    expect(new Set(PREVIEW_THEMES.map((theme) => theme.id)).size).toBe(PREVIEW_THEMES.length);
  });

  it("resolves every label in both dictionaries", () => {
    const en = getMessages("en");
    const zhCN = getMessages("zh-CN");
    for (const theme of PREVIEW_THEMES) {
      expect(en[theme.labelKey]).toBeTruthy();
      expect(zhCN[theme.labelKey]).toBeTruthy();
      expect(en[theme.labelKey]).not.toBe(zhCN[theme.labelKey]);
    }
  });

  it("only uses named built-in Mermaid themes paired with a surface", () => {
    const builtin = new Set(["default", "forest", "neutral", "neo", "dark", "neo-dark"]);
    for (const theme of PREVIEW_THEMES.slice(1)) {
      expect(theme.mermaidTheme).not.toBeNull();
      expect(builtin.has(theme.mermaidTheme as string)).toBe(true);
      expect(theme.surface === "light" || theme.surface === "dark").toBe(true);
    }
  });

  it("uses static, self-contained color constants only", () => {
    for (const theme of PREVIEW_THEMES) {
      expect(HEX.test(theme.swatch.from)).toBe(true);
      expect(HEX.test(theme.swatch.to)).toBe(true);
      expect(HEX.test(theme.swatch.accent)).toBe(true);
      if (theme.canvas !== null) {
        expect(HEX.test(theme.canvas)).toBe(true);
      }
      if (theme.grid !== null) {
        expect(RGBA.test(theme.grid)).toBe(true);
      }
    }
  });
});

describe("isPreviewThemeId / findPreviewTheme", () => {
  it("accepts every declared id and rejects unknown values", () => {
    for (const theme of PREVIEW_THEMES) {
      expect(isPreviewThemeId(theme.id)).toBe(true);
    }
    expect(isPreviewThemeId("")).toBe(false);
    expect(isPreviewThemeId("javascript:alert(1)")).toBe(false);
  });

  it("falls back to auto for an unknown id", () => {
    expect(findPreviewTheme("unknown").id).toBe("auto");
    expect(findPreviewTheme("").id).toBe("auto");
  });
});

describe("resolvePreviewTheme", () => {
  it("auto follows the host appearance and keeps host canvas tokens", () => {
    expect(resolvePreviewTheme("auto", "light")).toMatchObject({
      id: "auto",
      mermaidTheme: "default",
      surface: "light",
      canvas: null,
      grid: null
    });
    expect(resolvePreviewTheme("auto", "dark")).toMatchObject({
      id: "auto",
      mermaidTheme: "dark",
      surface: "dark",
      canvas: null,
      grid: null
    });
  });

  it("fixed themes ignore the host appearance", () => {
    for (const appearance of ["light", "dark"] as const) {
      expect(resolvePreviewTheme("forest", appearance)).toMatchObject({
        id: "forest",
        mermaidTheme: "forest",
        surface: "light"
      });
      expect(resolvePreviewTheme("dark", appearance)).toMatchObject({
        id: "dark",
        mermaidTheme: "dark",
        surface: "dark"
      });
      expect(resolvePreviewTheme("neo-dark", appearance)).toMatchObject({
        id: "neo-dark",
        mermaidTheme: "neo-dark",
        surface: "dark"
      });
    }
  });

  it("fixed themes supply a themed canvas, auto does not", () => {
    expect(resolvePreviewTheme("neo", "light").canvas).not.toBeNull();
    expect(resolvePreviewTheme("dark", "dark").canvas).not.toBeNull();
    expect(resolvePreviewTheme("auto", "dark").canvas).toBeNull();
  });

  it("an unknown id degrades to auto", () => {
    const unknown = "unknown" as PreviewThemeId;
    expect(resolvePreviewTheme(unknown, "dark")).toMatchObject({
      id: "auto",
      mermaidTheme: "dark",
      surface: "dark"
    });
  });
});

describe("previewBackgroundColor", () => {
  it("uses the fixed theme canvas when one is defined", () => {
    expect(previewBackgroundColor(resolvePreviewTheme("forest", "dark"))).toBe("#f3f8f0");
    expect(previewBackgroundColor(resolvePreviewTheme("neo-dark", "light"))).toBe("#1b202b");
  });

  it("gives auto an opaque background that follows the surface", () => {
    expect(previewBackgroundColor(resolvePreviewTheme("auto", "light"))).toBe("#ffffff");
    expect(previewBackgroundColor(resolvePreviewTheme("auto", "dark"))).toBe("#18181b");
  });
});
