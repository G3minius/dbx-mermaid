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
    canvas: "#f7f6fb",
    grid: "rgba(108, 92, 152, 0.17)",
    swatch: { from: "#ececff", to: "#9370db", accent: "#4b3a8f" }
  },
  {
    id: "forest",
    labelKey: "themeForest",
    mermaidTheme: "forest",
    surface: "light",
    canvas: "#f3f8f0",
    grid: "rgba(78, 118, 68, 0.17)",
    swatch: { from: "#cde498", to: "#6eaa49", accent: "#2f5d1f" }
  },
  {
    id: "neutral",
    labelKey: "themeNeutral",
    mermaidTheme: "neutral",
    surface: "light",
    canvas: "#f8f8f8",
    grid: "rgba(105, 105, 112, 0.17)",
    swatch: { from: "#e6e6e6", to: "#8a8a8f", accent: "#3f3f46" }
  },
  {
    id: "neo",
    labelKey: "themeNeo",
    mermaidTheme: "neo",
    surface: "light",
    canvas: "#f4f7fd",
    grid: "rgba(78, 110, 172, 0.17)",
    swatch: { from: "#dbe7ff", to: "#4f7cff", accent: "#1e3a8a" }
  },
  {
    id: "dark",
    labelKey: "themeDark",
    mermaidTheme: "dark",
    surface: "dark",
    canvas: "#212125",
    grid: "rgba(208, 208, 226, 0.14)",
    swatch: { from: "#3a3a40", to: "#c9c9d2", accent: "#f4f4f5" }
  },
  {
    id: "neo-dark",
    labelKey: "themeNeoDark",
    mermaidTheme: "neo-dark",
    surface: "dark",
    canvas: "#1b202b",
    grid: "rgba(176, 198, 240, 0.14)",
    swatch: { from: "#27324a", to: "#7aa2ff", accent: "#e6edff" }
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
