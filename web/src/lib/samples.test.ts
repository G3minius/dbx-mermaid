import { describe, expect, it } from "vitest";
import { MAX_SOURCE_CHARS } from "./constants";
import { getMessages } from "./i18n";
import { DEFAULT_SAMPLE_ID, findSample, getDefaultSample, MERMAID_SAMPLES } from "./samples";
import { prepareSource } from "./source";

describe("Mermaid samples", () => {
  it("contains the seven core diagram types with unique ids", () => {
    expect(MERMAID_SAMPLES).toHaveLength(7);
    expect(new Set(MERMAID_SAMPLES.map((sample) => sample.id)).size).toBe(7);
  });

  it("are under the source limit and pass the source policy", () => {
    for (const sample of MERMAID_SAMPLES) {
      expect(sample.source.length).toBeLessThanOrEqual(MAX_SOURCE_CHARS);
      const result = prepareSource(sample.source);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.diagramType).toBe(sample.diagramType);
      }
    }
  });

  it("have localized labels", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const messages = getMessages(locale);
      for (const sample of MERMAID_SAMPLES) {
        expect(messages[sample.labelKey].length).toBeGreaterThan(0);
      }
    }
  });

  it("uses the flowchart sample as the default", () => {
    expect(getDefaultSample().id).toBe(DEFAULT_SAMPLE_ID);
    expect(getDefaultSample().diagramType).toBe("flowchart");
  });

  it("looks up samples by id", () => {
    expect(findSample("mindmap")?.diagramType).toBe("mindmap");
    expect(findSample("missing")).toBeUndefined();
  });
});
