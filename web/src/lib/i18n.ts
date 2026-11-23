export type SupportedLocale = "zh-CN" | "en";

export type SampleLabelKey =
  | "sampleFlowchart"
  | "sampleSequence"
  | "sampleClass"
  | "sampleState"
  | "sampleEr"
  | "sampleGantt"
  | "sampleMindmap";

export interface Messages {
  bootLoading: string;
  fatalTitle: string;
  bridgeMissingBody: string;
  bootFailedBody: string;
  unknownContributionTitle: string;
  unknownContributionHint: string;

  workbenchTitle: string;
  editorTitle: string;
  editorAriaLabel: string;
  editorPlaceholder: string;
  previewTitle: string;

  themeLabel: string;
  themeTitle: string;
  themeAuto: string;
  themeDefault: string;
  themeForest: string;
  themeNeutral: string;
  themeNeo: string;
  themeDark: string;
  themeNeoDark: string;

  sampleLabel: string;
  samplePlaceholder: string;
  sampleReplaceBody: string;
  sampleReplaceConfirm: string;
  sampleReplaceCancel: string;
  sampleFlowchart: string;
  sampleSequence: string;
  sampleClass: string;
  sampleState: string;
  sampleEr: string;
  sampleGantt: string;
  sampleMindmap: string;

  copySource: string;
  copySourceTitle: string;
  copiedSource: string;
  copyFailed: string;
  copyUnavailable: string;
  exportLabel: string;
  exportSvg: string;
  exportSvgTitle: string;
  exportPng: string;
  exportPngTitle: string;
  exportInProgress: string;
  exportedSvg: string;
  exportedPng: string;
  exportCanceled: string;
  exportFallbackCopied: string;
  exportPngNoSaveCopied: string;
  exportPngRasterFailedCopied: string;
  exportFailed: string;
  exportUnavailable: string;

  splitDividerSideBySide: string;
  splitDividerStacked: string;
  splitResetHint: string;
  splitReset: string;

  zoomOut: string;
  zoomIn: string;
  zoomReset: string;
  zoomFit: string;
  zoomDisabled: string;
  zoomCurrent: string;

  canvasViewport: string;
  canvasPanGroup: string;
  panUp: string;
  panDown: string;
  panLeft: string;
  panRight: string;

  fullscreenEnter: string;
  fullscreenExit: string;
  fullscreenHint: string;

  statusTypeValue: string;
  statusChars: string;
  statusLines: string;
  statusRenderTime: string;
  statusStateEmpty: string;
  statusStateLoading: string;
  statusStateRendering: string;
  statusStateReady: string;
  statusStateStale: string;
  statusStateError: string;
  typeFlowchart: string;
  typeSequence: string;
  typeClass: string;
  typeState: string;
  typeEr: string;
  typeGantt: string;
  typeMindmap: string;
  typeOther: string;

  emptyPreviewTitle: string;
  emptyPreviewBody: string;

  errorTitle: string;
  errorLine: string;
  errorSnippet: string;
  errorLastGood: string;
  errorRetry: string;
  errorLoadFailed: string;
  errorUnsafeSvg: string;
  errorFenceHint: string;
  errorUnknown: string;
  sourceTooLong: string;
  sourceClickBlocked: string;
  sourceJavaScriptBlocked: string;
  sourceImageBlocked: string;
  sourceInitBlocked: string;
}

const en: Messages = {
  bootLoading: "Loading Mermaid…",
  fatalTitle: "Mermaid could not start",
  bridgeMissingBody:
    "The DBX host bridge was not found. Open this view from DBX instead of loading the build output directly.",
  bootFailedBody: "The DBX host did not finish initializing this view. Reopen it from DBX and try again.",
  unknownContributionTitle: "Unknown plugin entry point",
  unknownContributionHint: "Reopen Mermaid from the DBX plugin center.",

  workbenchTitle: "Mermaid editor",
  editorTitle: "Code",
  editorAriaLabel: "Mermaid source code",
  editorPlaceholder: "Type Mermaid source here. The preview updates as you type.",
  previewTitle: "Preview",

  themeLabel: "Preview theme",
  themeTitle: "Diagram colors and canvas background. Auto follows the DBX appearance.",
  themeAuto: "Auto (DBX)",
  themeDefault: "Classic",
  themeForest: "Forest",
  themeNeutral: "Neutral",
  themeNeo: "Modern",
  themeDark: "Dark",
  themeNeoDark: "Modern dark",

  sampleLabel: "Samples",
  samplePlaceholder: "Load a sample…",
  sampleReplaceBody: "Loading the “{name}” sample will replace the current code.",
  sampleReplaceConfirm: "Replace",
  sampleReplaceCancel: "Cancel",
  sampleFlowchart: "Flowchart",
  sampleSequence: "Sequence",
  sampleClass: "Class",
  sampleState: "State",
  sampleEr: "ER",
  sampleGantt: "Gantt",
  sampleMindmap: "Mindmap",

  copySource: "Copy",
  copySourceTitle: "Copy Mermaid source",
  copiedSource: "Source copied",
  copyFailed: "Copy failed. Select the text and copy it manually.",
  copyUnavailable: "Clipboard writing is unavailable in this host.",
  exportLabel: "Export",
  exportSvg: "SVG",
  exportSvgTitle: "Save the diagram as an SVG file",
  exportPng: "PNG",
  exportPngTitle: "Save the diagram as a 2x PNG image",
  exportInProgress: "Exporting…",
  exportedSvg: "SVG saved",
  exportedPng: "PNG saved",
  exportCanceled: "Export canceled",
  exportFallbackCopied: "Saving is unavailable, so the SVG source was copied instead.",
  exportPngNoSaveCopied:
    "This host cannot save a PNG, so the SVG source was copied. Use the SVG button instead.",
  exportPngRasterFailedCopied:
    "PNG rasterization is blocked in this host, so the SVG source was copied. Use the SVG button instead.",
  exportFailed: "Export failed: {message}",
  exportUnavailable: "This host cannot save or copy the diagram.",

  splitDividerSideBySide: "Resize the code and preview panes",
  splitDividerStacked: "Resize the code and preview rows",
  splitResetHint: "Double-click or press Enter to reset",
  splitReset: "Split reset to 44/56",

  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  zoomReset: "Reset to 100%",
  zoomFit: "Fit to window",
  zoomDisabled: "Nothing to zoom yet",
  zoomCurrent: "Current zoom {zoom}; click to reset to 100%",

  canvasViewport: "Diagram canvas. Use arrow keys to pan, the wheel to zoom.",
  canvasPanGroup: "Canvas pan controls",
  panUp: "Pan up",
  panDown: "Pan down",
  panLeft: "Pan left",
  panRight: "Pan right",

  fullscreenEnter: "Fullscreen",
  fullscreenExit: "Exit fullscreen",
  fullscreenHint: "Press Esc to exit",

  statusTypeValue: "Type: {type}",
  statusChars: "{count} chars",
  statusLines: "{count} lines",
  statusRenderTime: "{ms} ms",
  statusStateEmpty: "Waiting for input",
  statusStateLoading: "Loading renderer…",
  statusStateRendering: "Rendering…",
  statusStateReady: "Rendered",
  statusStateStale: "Showing last good render",
  statusStateError: "Render failed",
  typeFlowchart: "Flowchart",
  typeSequence: "Sequence",
  typeClass: "Class",
  typeState: "State",
  typeEr: "ER",
  typeGantt: "Gantt",
  typeMindmap: "Mindmap",
  typeOther: "Mermaid",

  emptyPreviewTitle: "Nothing to preview yet",
  emptyPreviewBody: "Type Mermaid source on the left and the diagram will appear here.",

  errorTitle: "This diagram could not be rendered",
  errorLine: "Line {line}",
  errorSnippet: "Nearby code",
  errorLastGood: "The preview still shows the last successful render.",
  errorRetry: "Retry",
  errorLoadFailed: "The renderer could not be loaded. Retry or reopen this view.",
  errorUnsafeSvg: "The rendered SVG did not pass the safety check and was not displayed.",
  errorFenceHint: "A Markdown fence was detected. Remove the opening ```mermaid and the closing ```.",
  errorUnknown: "Render failed: {message}",
  sourceTooLong: "The source exceeds the 50,000 character limit. Shorten it and try again.",
  sourceClickBlocked: "The click interaction directive is not supported for security reasons.",
  sourceJavaScriptBlocked: "The source contains a javascript: link and was rejected.",
  sourceImageBlocked: "Image node syntax is not supported for security reasons.",
  sourceInitBlocked: "Overriding Mermaid initialization from the source is not supported."
};

const zhCN: Messages = {
  bootLoading: "正在加载 Mermaid…",
  fatalTitle: "Mermaid 无法启动",
  bridgeMissingBody: "未检测到 DBX 宿主桥接。请从 DBX 中打开此视图，不要直接访问构建产物。",
  bootFailedBody: "DBX 宿主未能完成此视图的初始化。请关闭后从 DBX 重新打开。",
  unknownContributionTitle: "未知的插件入口",
  unknownContributionHint: "请从 DBX 插件中心重新打开 Mermaid。",

  workbenchTitle: "Mermaid 编辑器",
  editorTitle: "代码",
  editorAriaLabel: "Mermaid 源码",
  editorPlaceholder: "在这里输入 Mermaid 源码，右侧会实时预览。",
  previewTitle: "预览",

  themeLabel: "预览主题",
  themeTitle: "图表配色与画布背景；跟随外观会随 DBX 明暗自动切换。",
  themeAuto: "跟随外观",
  themeDefault: "经典",
  themeForest: "森林",
  themeNeutral: "极简",
  themeNeo: "现代",
  themeDark: "深夜",
  themeNeoDark: "现代深色",

  sampleLabel: "示例",
  samplePlaceholder: "载入示例…",
  sampleReplaceBody: "载入“{name}”示例会覆盖编辑器中的内容。",
  sampleReplaceConfirm: "替换",
  sampleReplaceCancel: "取消",
  sampleFlowchart: "流程图",
  sampleSequence: "时序图",
  sampleClass: "类图",
  sampleState: "状态图",
  sampleEr: "ER 图",
  sampleGantt: "甘特图",
  sampleMindmap: "思维导图",

  copySource: "复制",
  copySourceTitle: "复制 Mermaid 源码",
  copiedSource: "源码已复制",
  copyFailed: "复制失败，请手动选择文本复制。",
  copyUnavailable: "当前宿主不支持写入剪贴板。",
  exportLabel: "导出",
  exportSvg: "SVG",
  exportSvgTitle: "将图表保存为 SVG 文件",
  exportPng: "PNG",
  exportPngTitle: "将图表保存为 2 倍分辨率 PNG 图片",
  exportInProgress: "正在导出…",
  exportedSvg: "SVG 已保存",
  exportedPng: "PNG 已保存",
  exportCanceled: "已取消导出",
  exportFallbackCopied: "宿主不支持直接保存，已复制 SVG 源码。",
  exportPngNoSaveCopied: "当前宿主无法保存 PNG，已复制 SVG 源码；请改用 SVG 导出。",
  exportPngRasterFailedCopied: "当前宿主阻止 PNG 光栅化，已复制 SVG 源码；请改用 SVG 导出。",
  exportFailed: "导出失败：{message}",
  exportUnavailable: "当前宿主无法保存或复制图表。",

  splitDividerSideBySide: "调整代码与预览的宽度",
  splitDividerStacked: "调整代码与预览的高度",
  splitResetHint: "双击或按 Enter 复位",
  splitReset: "分栏已复位为 44/56",

  zoomOut: "缩小",
  zoomIn: "放大",
  zoomReset: "重置为 100%",
  zoomFit: "适应窗口",
  zoomDisabled: "暂无可缩放的图表",
  zoomCurrent: "当前缩放 {zoom}，点击重置为 100%",

  canvasViewport: "图表画布，方向键平移，滚轮缩放",
  canvasPanGroup: "画布平移控件",
  panUp: "向上平移",
  panDown: "向下平移",
  panLeft: "向左平移",
  panRight: "向右平移",

  fullscreenEnter: "全屏",
  fullscreenExit: "退出全屏",
  fullscreenHint: "按 Esc 退出全屏",

  statusTypeValue: "类型: {type}",
  statusChars: "{count} 字符",
  statusLines: "{count} 行",
  statusRenderTime: "{ms} ms",
  statusStateEmpty: "等待输入",
  statusStateLoading: "正在加载渲染引擎…",
  statusStateRendering: "正在渲染…",
  statusStateReady: "已渲染",
  statusStateStale: "显示上次成功结果",
  statusStateError: "渲染失败",
  typeFlowchart: "流程图",
  typeSequence: "时序图",
  typeClass: "类图",
  typeState: "状态图",
  typeEr: "ER 图",
  typeGantt: "甘特图",
  typeMindmap: "思维导图",
  typeOther: "Mermaid",

  emptyPreviewTitle: "暂无图表",
  emptyPreviewBody: "在左侧输入 Mermaid 语法，图表会实时显示在这里。",

  errorTitle: "无法渲染此图表",
  errorLine: "第 {line} 行",
  errorSnippet: "附近代码",
  errorLastGood: "右侧仍显示上一次成功渲染的图表。",
  errorRetry: "重试",
  errorLoadFailed: "渲染引擎加载失败，请重试或重新打开视图。",
  errorUnsafeSvg: "渲染结果未通过安全检查，已拒绝显示。",
  errorFenceHint: "检测到 Markdown 围栏，请去掉开头的 ```mermaid 和结尾的 ```。",
  errorUnknown: "渲染失败：{message}",
  sourceTooLong: "源码超过 50,000 字符上限，请精简后重试。",
  sourceClickBlocked: "出于安全考虑，不支持 click 交互指令。",
  sourceJavaScriptBlocked: "源码包含 javascript: 链接，已被拒绝。",
  sourceImageBlocked: "出于安全考虑，不支持图片节点语法。",
  sourceInitBlocked: "不支持在源码中覆盖 Mermaid 初始化配置。"
};

const dictionaries: Record<SupportedLocale, Messages> = {
  en,
  "zh-CN": zhCN
};

export function getMessages(locale: SupportedLocale): Messages {
  return dictionaries[locale];
}

export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
