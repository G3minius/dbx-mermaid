import type { Appearance } from "./dbx";
import type { Messages } from "./i18n";

/**
 * Mermaid 11.17.2 built-in themes exposed in the preview picker. Only named
 * built-in themes are used: no custom themeVariables, so every diagram type
 * keeps the palette the renderer was tested with.
 */
export type MermaidThemeName = "default" | "forest" | "neutral" | "neo" | "dark" | "neo-dark";

export type PreviewThemeId = "auto" | MermaidThemeName;

export type PreviewSurface = "light" | "dark";

export interface ThemeSwatch {
  from: string;
  to: string;
  accent: string;
}

export interface PreviewTheme {
  id: PreviewThemeId;
  labelKey: keyof Messages;
  /** null means "follow the DBX host appearance". */
  mermaidTheme: MermaidThemeName | null;
  /** null means "use the DBX host canvas tokens". */
  surface: PreviewSurface | null;
  /** null means "let CSS fall back to --mermaid-bg / --mermaid-grid". */
  canvas: string | null;
  grid: string | null;
  swatch: ThemeSwatch;
}

export interface ResolvedPreviewTheme {
  id: PreviewThemeId;
  mermaidTheme: MermaidThemeName;
  surface: PreviewSurface;
  canvas: string | null;
  grid: string | null;
  swatch: ThemeSwatch;
}

export const DEFAULT_PREVIEW_THEME_ID: PreviewThemeId = "auto";

const AUTO_SWATCH: ThemeSwatch = {
  from: "#f5f5f7",
  to: "#2a2b30",
  accent: "#0f766e"
};

/**
 * A curated set of preview styles. Each fixed theme pairs the Mermaid palette
 * with a canvas colour and dot grid tuned for it, so dark themes never end up
 * with unreadable light-on-light output. Values are design constants, never
 * derived from user input.
 *
 * Palette rules (see docs/mermaid-plugin-analysis.md):
 * - the canvas is a low-contrast paper or ink tint, never pure white/black, so
 *   the diagram itself stays the only focal point;
 * - the dot grid is a whisper (alpha 0.06–0.10) and only hints "this pans";
 * - the swatch accent is a desaturated hue, because the chip is 14px and a
 *   saturated one reads as an alert rather than a theme.
 */
export const PREVIEW_THEMES: readonly PreviewTheme[] = [
  {
    id: "auto",
    labelKey: "themeAuto",
    mermaidTheme: null,
    surface: null,
    canvas: null,
    grid: null,
    swatch: AUTO_SWATCH
  },
  {
    id: "default",
    labelKey: "themeDefault",
    mermaidTheme: "default",
    surface: "light",
    canvas: "#f8f7fc",
    grid: "rgba(100, 90, 140, 0.09)",
    swatch: { from: "#eee9fb", to: "#b3a4e6", accent: "#6d5bb8" }
  },
  {
    id: "forest",
    labelKey: "themeForest",
    mermaidTheme: "forest",
    surface: "light",
    canvas: "#f4f7f2",
    grid: "rgba(70, 95, 70, 0.1)",
    swatch: { from: "#e3eedd", to: "#a8c79a", accent: "#4e7a4e" }
  },
  {
    id: "neutral",
    labelKey: "themeNeutral",
    mermaidTheme: "neutral",
    surface: "light",
    canvas: "#faf9f6",
    grid: "rgba(88, 80, 70, 0.09)",
    swatch: { from: "#f3efe7", to: "#c9bca9", accent: "#6b5b4a" }
  },
  {
    id: "neo",
    labelKey: "themeNeo",
    mermaidTheme: "neo",
    surface: "light",
    canvas: "#f5f7fa",
    grid: "rgba(70, 85, 110, 0.1)",
    swatch: { from: "#e7edfb", to: "#8fa6f0", accent: "#3b57d6" }
  },
  {
    id: "dark",
    labelKey: "themeDark",
    mermaidTheme: "dark",
    surface: "dark",
    canvas: "#14151a",
    grid: "rgba(200, 205, 225, 0.07)",
    swatch: { from: "#2b2d36", to: "#c9c9d2", accent: "#a3b1ff" }
  },
  {
    id: "neo-dark",
    labelKey: "themeNeoDark",
    mermaidTheme: "neo-dark",
    surface: "dark",
    canvas: "#0e1014",
    grid: "rgba(180, 195, 225, 0.06)",
    swatch: { from: "#1b2334", to: "#7aa2ff", accent: "#7aa2ff" }
  }
];

export function isPreviewThemeId(value: string): value is PreviewThemeId {
  return PREVIEW_THEMES.some((theme) => theme.id === value);
}

export function findPreviewTheme(id: string): PreviewTheme {
  return PREVIEW_THEMES.find((theme) => theme.id === id) ?? PREVIEW_THEMES[0];
}

/** Pure: the caller supplies the current host appearance. */
export function resolvePreviewTheme(
  id: PreviewThemeId,
  appearance: Appearance
): ResolvedPreviewTheme {
  const theme = findPreviewTheme(id);
  if (theme.mermaidTheme !== null && theme.surface !== null) {
    return {
      id: theme.id,
      mermaidTheme: theme.mermaidTheme,
      surface: theme.surface,
      canvas: theme.canvas,
      grid: theme.grid,
      swatch: theme.swatch
    };
  }

  const dark = appearance === "dark";
  return {
    id: "auto",
    mermaidTheme: dark ? "dark" : "default",
    surface: dark ? "dark" : "light",
    canvas: null,
    grid: null,
    swatch: AUTO_SWATCH
  };
}

/**
 * Pure: the solid colour used behind an exported PNG. `auto` has no canvas
 * token (it follows DBX design tokens), so map its surface to an equivalent
 * opaque colour instead of exporting a transparent image.
 */
export function previewBackgroundColor(theme: ResolvedPreviewTheme): string {
  if (theme.canvas !== null) {
    return theme.canvas;
  }
  return theme.surface === "dark" ? "#18181b" : "#ffffff";
}
