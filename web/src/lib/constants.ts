export const PLUGIN_ID = "g3minius.dbx-mermaid";
export const WORKBENCH_ID = `${PLUGIN_ID}.workbench`;

export const MAX_SOURCE_CHARS = 50_000;
export const MAX_RENDER_EDGES = 500;

export const RENDER_DEBOUNCE_MS = 300;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 1.2;
export const CANVAS_PADDING = 24;

/** Continuous wheel zoom: factor = exp(-normalizedDelta * sensitivity), clamped per event. */
export const ZOOM_WHEEL_SENSITIVITY = 0.0015;
export const ZOOM_WHEEL_FACTOR_MIN = 0.8;
export const ZOOM_WHEEL_FACTOR_MAX = 1.25;
/** WheelEvent DOM_DELTA_LINE -> pixels. DOM_DELTA_PAGE uses the viewport height. */
export const WHEEL_LINE_HEIGHT = 16;
/** One click on a directional pan button / keyboard arrow step, in CSS pixels. */
export const PAN_STEP = 64;
export const KEY_PAN_STEP = 40;

/* Resizable split: wide screens use columns, narrow screens use rows. */
export const SPLIT_DEFAULT_RATIO = 0.44;
export const SPLIT_MIN_RATIO = 0.15;
export const SPLIT_MAX_RATIO = 0.85;
export const SPLIT_GUTTER_PX = 8;
export const SPLIT_MIN_PANE_PX = 220;
export const SPLIT_MIN_ROW_PX = 160;
export const SPLIT_KEYBOARD_STEP = 0.02;
export const SPLIT_KEYBOARD_LARGE_STEP = 0.1;
export const SPLIT_NARROW_BREAKPOINT_PX = 900;

/* PNG rasterisation: 2x by default, capped so a huge diagram cannot exhaust memory. */
export const PNG_SCALE = 2;
export const PNG_MAX_SIDE = 8192;
export const PNG_MAX_PIXELS = 32 * 1024 * 1024;
