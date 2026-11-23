import { describe, expect, it } from "vitest";
import { buildSnippet, extractErrorLine, normalizeRenderError } from "./errors";

describe("extractErrorLine", () => {
  it("reads Mermaid's line number", () => {
    expect(extractErrorLine("Parse error on line 3:\n...")).toBe(3);
    expect(extractErrorLine("Error at LINE 12")).toBe(12);
  });

  it("returns undefined when no positive line is present", () => {
    expect(extractErrorLine("Parse error")).toBeUndefined();
    expect(extractErrorLine("Parse error on line 0")).toBeUndefined();
  });
});

describe("buildSnippet", () => {
  const source = "flowchart LR\nA --> B\nB --> C\nC --> D\nD --> E";

  it("returns the target line with context and line numbers", () => {
    expect(buildSnippet(source, 3)).toBe(
      "1 | flowchart LR\n2 | A --> B\n3 | B --> C\n4 | C --> D\n5 | D --> E"
    );
  });

  it("returns undefined when the line is outside the source", () => {
    expect(buildSnippet(source, 0)).toBeUndefined();
    expect(buildSnippet(source, 99)).toBeUndefined();
  });
});

describe("normalizeRenderError", () => {
  it("normalizes an Error with line information", () => {
    const result = normalizeRenderError(
      new Error("Parse error on line 2:\nA --> B\n     ^"),
      "flowchart LR\nA --> B\nB --> C",
      "parse"
    );
    expect(result.kind).toBe("parse");
    expect(result.line).toBe(2);
    expect(result.snippet).toContain("2 | A --> B");
    expect(result.message).toContain("Parse error");
  });

  it("normalizes string and object errors", () => {
    expect(normalizeRenderError("boom", "", "unknown").message).toBe("boom");
    expect(normalizeRenderError({ message: "object boom" }, "", "unknown").message).toBe("object boom");
    expect(normalizeRenderError({ str: "str boom" }, "", "unknown").message).toBe("str boom");
  });

  it("removes ANSI escape sequences", () => {
    expect(normalizeRenderError("\u001b[31mboom\u001b[0m", "", "unknown").message).toBe("boom");
  });

  it("caps very long messages", () => {
    const result = normalizeRenderError("x".repeat(3_000), "", "unknown");
    expect(result.message.length).toBe(2_001);
    expect(result.message.endsWith("…")).toBe(true);
  });

  it("falls back to a readable message for empty errors", () => {
    expect(normalizeRenderError(null, "", "unknown").message).toBe("Unknown error");
  });
});
