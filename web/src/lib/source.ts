import { MAX_SOURCE_CHARS } from "./constants";

export type DiagramType =
  | "flowchart"
  | "sequence"
  | "class"
  | "state"
  | "er"
  | "gantt"
  | "mindmap";

export type SourceProblem =
  | "empty"
  | "too-long"
  | "click"
  | "javascript"
  | "image"
  | "init-directive";

export type PrepareResult =
  | { ok: true; source: string; diagramType: DiagramType | null }
  | { ok: false; problem: SourceProblem };

const CLICK_DIRECTIVE = /^\s*click\s+[A-Za-z_][\w-]*/im;
const JAVASCRIPT_LINK = /javascript:/i;
const IMAGE_NODE = /@\{\s*img\s*:/i;
const INIT_DIRECTIVE = /%%\{\s*(?:init|initialize)\b/i;

/**
 * Normalizes the raw editor value without changing meaningful line structure.
 * BOM removal and CRLF normalization keep Mermaid's reported line numbers
 * aligned with the line-number gutter.
 */
export function normalizeSource(raw: string): string {
  return raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

export function prepareSource(raw: string): PrepareResult {
  const source = normalizeSource(raw);
  if (source.trim() === "") {
    return { ok: false, problem: "empty" };
  }
  if (source.length > MAX_SOURCE_CHARS) {
    return { ok: false, problem: "too-long" };
  }
  if (CLICK_DIRECTIVE.test(source)) {
    return { ok: false, problem: "click" };
  }
  if (JAVASCRIPT_LINK.test(source)) {
    return { ok: false, problem: "javascript" };
  }
  if (IMAGE_NODE.test(source)) {
    return { ok: false, problem: "image" };
  }
  if (INIT_DIRECTIVE.test(source)) {
    return { ok: false, problem: "init-directive" };
  }
  return { ok: true, source, diagramType: detectDiagramType(source) };
}

const DIAGRAM_HEADERS: ReadonlyArray<[RegExp, DiagramType]> = [
  [/^(?:flowchart|graph)\b/i, "flowchart"],
  [/^sequencediagram\b/i, "sequence"],
  [/^classdiagram\b/i, "class"],
  [/^statediagram\b/i, "state"],
  [/^erdiagram\b/i, "er"],
  [/^gantt\b/i, "gantt"],
  [/^mindmap\b/i, "mindmap"]
];

export function detectDiagramType(source: string): DiagramType | null {
  const lines = source.split("\n").map((line) => line.trim());
  let index = 0;

  if (lines[0] === "---") {
    index = 1;
    while (index < lines.length && lines[index] !== "---") {
      index += 1;
    }
    if (index < lines.length) {
      index += 1;
    }
  }

  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "" || line.startsWith("%%")) {
      continue;
    }
    for (const [pattern, type] of DIAGRAM_HEADERS) {
      if (pattern.test(line)) {
        return type;
      }
    }
    return null;
  }
  return null;
}

export function countLines(source: string): number {
  return source.trim() === "" ? 0 : source.split("\n").length;
}
