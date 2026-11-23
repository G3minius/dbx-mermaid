import { describe, expect, it } from "vitest";
import { formatMessage, getMessages } from "./i18n";

describe("formatMessage", () => {
  it("replaces known placeholders", () => {
    expect(formatMessage("{columns} columns / {rows} rows", { columns: 3, rows: 12 })).toBe(
      "3 columns / 12 rows"
    );
  });

  it("keeps unknown placeholders untouched", () => {
    expect(formatMessage("{missing}", {})).toBe("{missing}");
  });
});

describe("getMessages", () => {
  it("returns distinct dictionaries for zh-CN and en", () => {
    expect(getMessages("zh-CN").workbenchTitle).not.toBe(getMessages("en").workbenchTitle);
  });

  it("localizes every canvas and fullscreen control in both dictionaries", () => {
    const en = getMessages("en");
    const zhCN = getMessages("zh-CN");
    const keys = [
      "zoomCurrent",
      "canvasViewport",
      "canvasPanGroup",
      "panUp",
      "panDown",
      "panLeft",
      "panRight",
      "fullscreenEnter",
      "fullscreenExit",
      "fullscreenHint",
      "exportLabel",
      "exportSvgTitle",
      "exportPngTitle",
      "exportedPng",
      "exportPngNoSaveCopied",
      "exportPngRasterFailedCopied",
      "splitDividerSideBySide",
      "splitDividerStacked",
      "splitResetHint",
      "splitReset"
    ] as const;
    for (const key of keys) {
      expect(en[key]).toBeTruthy();
      expect(zhCN[key]).toBeTruthy();
      expect(en[key]).not.toBe(zhCN[key]);
    }
  });
});
