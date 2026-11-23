export type RenderErrorKind = "parse" | "load" | "security" | "unknown";

export interface RenderErrorInfo {
  kind: RenderErrorKind;
  message: string;
  line?: number;
  snippet?: string;
}

const ANSI_ESCAPE = /\u001b\[[0-9;]*m/g;
const MAX_MESSAGE_CHARS = 2_000;

function readRawMessage(error: unknown): string {
  if (error === null || error === undefined) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    const record = error as { message?: unknown; str?: unknown };
    if (typeof record.message === "string") {
      return record.message;
    }
    if (typeof record.str === "string") {
      return record.str;
    }
  }
  return String(error);
}

export function extractErrorLine(message: string): number | undefined {
  const match = /line\s+(\d+)/i.exec(message);
  if (match === null) {
    return undefined;
  }
  const line = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(line) && line > 0 ? line : undefined;
}

export function buildSnippet(source: string, line: number, radius = 2): string | undefined {
  if (line <= 0) {
    return undefined;
  }
  const lines = source.split("\n");
  if (line > lines.length) {
    return undefined;
  }
  const start = Math.max(0, line - 1 - radius);
  const end = Math.min(lines.length, line - 1 + radius + 1);
  return lines
    .slice(start, end)
    .map((text, offset) => `${start + offset + 1} | ${text}`)
    .join("\n");
}

export function normalizeRenderError(
  error: unknown,
  source = "",
  kind: RenderErrorKind = "unknown"
): RenderErrorInfo {
  const raw = readRawMessage(error).replace(ANSI_ESCAPE, "").trim();
  const message =
    raw.length > MAX_MESSAGE_CHARS ? `${raw.slice(0, MAX_MESSAGE_CHARS)}…` : raw || "Unknown error";
  const line = extractErrorLine(message);
  const snippet = line === undefined ? undefined : buildSnippet(source, line);
  const result: RenderErrorInfo = { kind, message };
  if (line !== undefined) {
    result.line = line;
  }
  if (snippet !== undefined) {
    result.snippet = snippet;
  }
  return result;
}
