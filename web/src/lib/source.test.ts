import { describe, expect, it } from "vitest";
import { MAX_SOURCE_CHARS } from "./constants";
import { countLines, detectDiagramType, normalizeSource, prepareSource } from "./source";

describe("normalizeSource", () => {
  it("removes the BOM and normalizes CRLF/CR to LF", () => {
    expect(normalizeSource("\uFEFFflowchart TD\r\nA-->B\rC")).toBe("flowchart TD\nA-->B\nC");
  });

  it("keeps meaningful whitespace", () => {
    expect(normalizeSource("  flowchart LR\n    A --> B  ")).toBe("  flowchart LR\n    A --> B  ");
  });
});

describe("prepareSource", () => {
  it("rejects an empty or whitespace-only source", () => {
    expect(prepareSource("")).toEqual({ ok: false, problem: "empty" });
    expect(prepareSource("   \n\t ")).toEqual({ ok: false, problem: "empty" });
  });

  it("accepts a flowchart and detects its type", () => {
    const result = prepareSource("flowchart TD\n  A --> B");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diagramType).toBe("flowchart");
      expect(result.source).toBe("flowchart TD\n  A --> B");
    }
  });

  it("rejects source over the character limit", () => {
    const source = `flowchart LR\nA[${"x".repeat(MAX_SOURCE_CHARS)}]`;
    expect(prepareSource(source)).toEqual({ ok: false, problem: "too-long" });
  });

  it("rejects click directives before parsing", () => {
    const source = 'flowchart LR\n  A --> B\n  click A "javascript:alert(1)"';
    expect(prepareSource(source)).toEqual({ ok: false, problem: "click" });
  });

  it("rejects javascript: links in labels", () => {
    const source = 'flowchart LR\n  A["javascript:alert(1)"] --> B';
    expect(prepareSource(source)).toEqual({ ok: false, problem: "javascript" });
  });

  it("rejects image node syntax", () => {
    const source = 'flowchart LR\n  A@{ img: "https://example.com/x.png" }';
    expect(prepareSource(source)).toEqual({ ok: false, problem: "image" });
  });

  it("rejects init directives", () => {
    const source = '%%{init: {"securityLevel":"loose"}}%%\nflowchart LR\n  A --> B';
    expect(prepareSource(source)).toEqual({ ok: false, problem: "init-directive" });
  });

  it("does not silently strip Markdown fences", () => {
    const source = "```mermaid\nflowchart LR\n  A --> B\n```";
    const result = prepareSource(source);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe(source);
      expect(result.diagramType).toBeNull();
    }
  });
});

describe("detectDiagramType", () => {
  it.each([
    ["flowchart TD\n  A --> B", "flowchart"],
    ["graph LR\n  A --> B", "flowchart"],
    ["sequenceDiagram\n  A->>B: hi", "sequence"],
    ["classDiagram\n  A <|-- B", "class"],
    ["stateDiagram-v2\n  [*] --> A", "state"],
    ["erDiagram\n  A ||--o{ B : has", "er"],
    ["gantt\n  title Test", "gantt"],
    ["mindmap\n  root((Mermaid))", "mindmap"]
  ] as const)("detects %s", (source, expected) => {
    expect(detectDiagramType(source)).toBe(expected);
  });

  it("skips comments and YAML frontmatter", () => {
    expect(detectDiagramType("%% a comment\n\nflowchart LR\n  A --> B")).toBe("flowchart");
    expect(detectDiagramType("---\ntitle: Test\n---\nflowchart LR\n  A --> B")).toBe("flowchart");
  });

  it("returns null for unknown or unsupported headers", () => {
    expect(detectDiagramType("this is not mermaid")).toBeNull();
    expect(detectDiagramType("```mermaid\nflowchart LR\nA-->B\n```")).toBeNull();
    expect(detectDiagramType("")).toBeNull();
  });
});

describe("countLines", () => {
  it("counts visual lines and treats blank source as zero", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("   ")).toBe(0);
    expect(countLines("flowchart LR\n  A --> B")).toBe(2);
    expect(countLines("flowchart LR\n  A --> B\n")).toBe(3);
  });
});
