import { getDefaultSample, findSample, MERMAID_SAMPLES, type MermaidSample } from "../lib/samples";
import { canCopy, canSaveFile, getAppearance, getLocale, onEnvironmentChange } from "../lib/dbx";
import { formatZoom } from "../lib/canvasMath";
import { RENDER_DEBOUNCE_MS, ZOOM_STEP } from "../lib/constants";
import { button, element } from "../lib/dom";
import { normalizeRenderError, type RenderErrorInfo } from "../lib/errors";
import { copySource, savePng, saveSvg, type PngSaveResult } from "../lib/export";
import { formatMessage, getMessages, type Messages } from "../lib/i18n";
import { isRendererLoaded, renderMermaid } from "../lib/mermaid";
import {
  countLines,
  detectDiagramType,
  prepareSource,
  type DiagramType,
  type SourceProblem
} from "../lib/source";
import {
  DEFAULT_PREVIEW_THEME_ID,
  isPreviewThemeId,
  PREVIEW_THEMES,
  previewBackgroundColor,
  resolvePreviewTheme,
  type MermaidThemeName,
  type PreviewThemeId
} from "../lib/themes";
import { createMermaidCanvas, type CanvasZoomState } from "../components/MermaidCanvas";
import { createSourceEditor } from "../components/SourceEditor";
import { createSplitDivider } from "../components/SplitPane";
import type { ViewHandle } from "./types";

type StatusState = "empty" | "loading" | "rendering" | "ready" | "error";
type ExportKind = "svg" | "png";

type WorkbenchError =
  | { kind: "policy"; problem: SourceProblem }
  | { kind: "render"; info: RenderErrorInfo }
  | null;

const TYPE_MESSAGE_KEYS: Record<DiagramType, keyof Messages> = {
  flowchart: "typeFlowchart",
  sequence: "typeSequence",
  class: "typeClass",
  state: "typeState",
  er: "typeEr",
  gantt: "typeGantt",
  mindmap: "typeMindmap"
};

export function mountWorkbench(root: HTMLElement): ViewHandle {
  let messages = getMessages(getLocale());
  let state: StatusState = "empty";
  let diagramType: DiagramType | null = null;
  let lastDurationMs: number | null = null;
  let errorState: WorkbenchError = null;
  let noticeText: string | null = null;
  let noticeTimer: number | undefined;
  let debounceTimer: number | undefined;
  let revision = 0;
  let queue: Promise<void> = Promise.resolve();
  let disposed = false;
  let exporting: ExportKind | null = null;
  let pendingSample: MermaidSample | null = null;
  let lastSampleSource = "";
  let currentZoom = 1;
  let previewThemeId: PreviewThemeId = DEFAULT_PREVIEW_THEME_ID;
  /** Source and palette of the diagram currently on the canvas. */
  let lastGoodSource: string | null = null;
  let renderedPalette: MermaidThemeName | null = null;
  let fullscreen = false;
  let fullscreenTrigger: HTMLElement | null = null;

  const controller = new AbortController();
  const section = element("section", "app");
  const split = element("main", "split");

  const editorPane = element("section", "pane pane--editor");
  editorPane.id = "dbx-mermaid-editor";
  const editorHead = element("header", "pane__head");
  const editorTitle = element("h2", "pane__title");
  const editorActions = element("div", "pane__actions");
  const sampleSelect = document.createElement("select");
  sampleSelect.className = "select samples";
  const copyButton = button(messages.copySource, "btn btn--ghost");
  editorActions.append(sampleSelect, copyButton);
  editorHead.append(editorTitle, editorActions);

  const replaceBar = element("div", "replace-bar");
  const replaceText = element("p", "replace-bar__text");
  const replaceConfirm = button("", "btn btn--primary");
  const replaceCancel = button("", "btn btn--ghost");
  replaceBar.append(replaceText, replaceConfirm, replaceCancel);
  replaceBar.hidden = true;

  const editor = createSourceEditor({
    placeholder: messages.editorPlaceholder,
    ariaLabel: messages.editorAriaLabel,
    onChange: handleEditorChange,
    onRenderRequest: requestRender
  });
  editorPane.append(editorHead, replaceBar, editor.element);

  const previewPane = element("section", "pane pane--preview");
  previewPane.id = "dbx-mermaid-preview";
  const previewHead = element("header", "pane__head");
  const previewTitle = element("h2", "pane__title");
  const previewActions = element("div", "pane__actions");
  const themePicker = element("label", "theme-picker");
  const themeSwatch = element("span", "theme-picker__swatch");
  themeSwatch.setAttribute("aria-hidden", "true");
  const themeSelect = document.createElement("select");
  themeSelect.className = "theme-picker__select";
  themePicker.append(themeSwatch, themeSelect);
  const zoomControls = element("div", "zoom-controls");
  const zoomOutButton = button("−", "btn btn--compact");
  const zoomLabelButton = button("100%", "zoom-label");
  const zoomInButton = button("+", "btn btn--compact");
  const fitButton = button("", "btn btn--ghost btn--compact");
  const exportControls = element("div", "export-controls");
  const exportLabel = element("span", "export-controls__label");
  const exportButton = button("", "btn btn--primary btn--compact btn--export");
  const exportPngButton = button("", "btn btn--ghost btn--compact btn--export");
  exportControls.append(exportLabel, exportButton, exportPngButton);
  const fullscreenButton = button("", "btn btn--ghost btn--compact btn--fullscreen");
  fullscreenButton.setAttribute("aria-pressed", "false");
  const fullscreenHint = element("span", "pane__hint");
  fullscreenHint.hidden = true;
  zoomControls.append(zoomOutButton, zoomLabelButton, zoomInButton, fitButton);
  previewActions.append(themePicker, zoomControls, exportControls, fullscreenButton, fullscreenHint);
  previewHead.append(previewTitle, previewActions);

  const previewBody = element("div", "preview");
  const errorBanner = element("section", "error-banner");
  errorBanner.hidden = true;
  errorBanner.setAttribute("role", "alert");
  const errorHead = element("div", "error-banner__head");
  const errorTitle = element("p", "error-banner__title");
  const errorLine = element("span", "error-banner__line");
  errorLine.hidden = true;
  const errorRetry = button("", "btn btn--ghost btn--compact");
  errorHead.append(errorTitle, errorLine, errorRetry);
  const errorMessage = element("pre", "error-banner__message");
  const errorSnippetLabel = element("p", "error-banner__label");
  errorSnippetLabel.hidden = true;
  const errorSnippet = element("pre", "error-banner__snippet");
  errorSnippet.hidden = true;
  const errorStale = element("p", "error-banner__stale");
  errorStale.hidden = true;
  errorBanner.append(errorHead, errorMessage, errorSnippetLabel, errorSnippet, errorStale);

  const previewCanvas = element("div", "preview__canvas");
  const canvas = createMermaidCanvas({ onZoomChange: handleZoomChange });

  const emptyState = element("div", "preview__empty");
  const emptyTitle = element("p", "preview__empty-title");
  const emptyBody = element("p", "preview__empty-body");
  emptyState.append(emptyTitle, emptyBody);

  const loadingState = element("div", "preview__loading");
  const spinner = element("span", "spinner");
  spinner.setAttribute("aria-hidden", "true");
  const loadingText = element("p", "preview__loading-text");
  loadingState.append(spinner, loadingText);

  previewCanvas.append(canvas.element, emptyState, loadingState);
  previewBody.append(errorBanner, previewCanvas);
  previewPane.append(previewHead, previewBody);

  const statusbar = element("footer", "statusbar");
  const statusType = element("span", "statusbar__item");
  const statusChars = element("span", "statusbar__item statusbar__optional");
  const statusLines = element("span", "statusbar__item statusbar__optional");
  const statusTime = element("span", "statusbar__item");
  const statusSpacer = element("span", "statusbar__spacer");
  const statusState = element("span", "statusbar__state");
  statusState.setAttribute("aria-live", "polite");
  statusbar.append(statusType, statusChars, statusLines, statusTime, statusSpacer, statusState);

  const splitDivider = createSplitDivider({
    container: split,
    editorId: editorPane.id,
    previewId: previewPane.id,
    labels: {
      sideBySide: messages.splitDividerSideBySide,
      stacked: messages.splitDividerStacked,
      resetHint: messages.splitResetHint
    },
    onReset: () => showNotice(messages.splitReset)
  });

  split.append(editorPane, splitDivider.element, previewPane);
  section.append(split, statusbar);
  root.append(section);

  /** Paint the preview surface (canvas + dot grid + swatch) for the active theme. */
  function applyPreviewSurface(): void {
    const resolved = resolvePreviewTheme(previewThemeId, getAppearance());
    // Surface tokens live on the pane so the fullscreen toolbar (a sibling of
    // .preview) inherits the same themed background and overlay text colors.
    previewPane.dataset.previewSurface = resolved.surface;
    if (resolved.canvas === null) {
      previewPane.style.removeProperty("--preview-bg");
    } else {
      previewPane.style.setProperty("--preview-bg", resolved.canvas);
    }
    if (resolved.grid === null) {
      previewPane.style.removeProperty("--preview-grid");
    } else {
      previewPane.style.setProperty("--preview-grid", resolved.grid);
    }
    themeSwatch.style.setProperty("--swatch-from", resolved.swatch.from);
    themeSwatch.style.setProperty("--swatch-to", resolved.swatch.to);
    themeSwatch.style.setProperty("--swatch-accent", resolved.swatch.accent);
  }

  function clearNoticeTimer(): void {
    if (noticeTimer !== undefined) {
      window.clearTimeout(noticeTimer);
      noticeTimer = undefined;
    }
  }

  function paintStatus(): void {
    const text = noticeText ?? stateText();
    statusState.textContent = text;
    if (noticeText !== null) {
      statusState.dataset.tone = "info";
    } else if (state === "ready") {
      statusState.dataset.tone = "ok";
    } else if (state === "error") {
      statusState.dataset.tone = canvas.hasSvg() ? "warning" : "danger";
    } else {
      statusState.dataset.tone = "muted";
    }
  }

  function stateText(): string {
    switch (state) {
      case "empty":
        return messages.statusStateEmpty;
      case "loading":
        return messages.statusStateLoading;
      case "rendering":
        return messages.statusStateRendering;
      case "ready":
        return messages.statusStateReady;
      case "error":
        return canvas.hasSvg() ? messages.statusStateStale : messages.statusStateError;
    }
  }

  function setState(next: StatusState): void {
    state = next;
    clearNoticeTimer();
    noticeText = null;
    paintStatus();
  }

  function showNotice(text: string): void {
    noticeText = text;
    clearNoticeTimer();
    noticeTimer = window.setTimeout(() => {
      noticeTimer = undefined;
      noticeText = null;
      paintStatus();
    }, 2400);
    paintStatus();
  }

  function policyMessage(problem: SourceProblem): string {
    switch (problem) {
      case "too-long":
        return messages.sourceTooLong;
      case "click":
        return messages.sourceClickBlocked;
      case "javascript":
        return messages.sourceJavaScriptBlocked;
      case "image":
        return messages.sourceImageBlocked;
      case "init-directive":
        return messages.sourceInitBlocked;
      case "empty":
        return messages.emptyPreviewBody;
    }
  }

  function renderErrorText(info: RenderErrorInfo): string {
    switch (info.kind) {
      case "load":
        return messages.errorLoadFailed;
      case "security":
        return messages.errorUnsafeSvg;
      case "unknown":
        return formatMessage(messages.errorUnknown, { message: info.message });
      case "parse":
        return info.message;
    }
  }

  function paintError(): void {
    if (errorState === null) {
      errorBanner.hidden = true;
      return;
    }

    errorBanner.hidden = false;
    errorTitle.textContent = messages.errorTitle;
    errorRetry.textContent = messages.errorRetry;
    errorLine.hidden = true;
    errorSnippetLabel.hidden = true;
    errorSnippet.hidden = true;
    errorStale.hidden = !canvas.hasSvg();
    errorStale.textContent = messages.errorLastGood;

    if (errorState.kind === "policy") {
      errorMessage.textContent = policyMessage(errorState.problem);
      return;
    }

    const info = errorState.info;
    errorMessage.textContent = renderErrorText(info);
    if (info.line !== undefined) {
      errorLine.hidden = false;
      errorLine.textContent = formatMessage(messages.errorLine, { line: info.line });
    }
    if (info.snippet !== undefined) {
      errorSnippetLabel.hidden = false;
      errorSnippetLabel.textContent = messages.errorSnippet;
      errorSnippet.hidden = false;
      errorSnippet.textContent = info.snippet;
    }
    if (info.kind === "parse" && editor.getValue().trimStart().startsWith("```")) {
      errorMessage.textContent = `${errorMessage.textContent}\n${messages.errorFenceHint}`;
    }
  }

  function updateMeta(): void {
    const value = editor.getValue();
    statusType.textContent = formatMessage(messages.statusTypeValue, {
      type: diagramType === null ? "—" : messages[TYPE_MESSAGE_KEYS[diagramType]]
    });
    statusChars.textContent = formatMessage(messages.statusChars, { count: value.length });
    statusLines.textContent = formatMessage(messages.statusLines, { count: countLines(value) });
    statusTime.textContent =
      lastDurationMs === null
        ? "—"
        : formatMessage(messages.statusRenderTime, { ms: Math.round(lastDurationMs) });
  }

  function updateOverlays(): void {
    const sourceEmpty = editor.getValue().trim() === "";
    const hasSvg = canvas.hasSvg();
    emptyState.hidden = !sourceEmpty || hasSvg || errorState !== null;
    loadingState.hidden =
      hasSvg ||
      errorState !== null ||
      (state !== "loading" && state !== "rendering");
    loadingText.textContent =
      state === "loading" ? messages.statusStateLoading : messages.statusStateRendering;
  }

  function updateActionStates(): void {
    const hasSvg = canvas.hasSvg();
    const clipboard = canCopy();

    copyButton.disabled = !clipboard;
    copyButton.title = clipboard ? messages.copySourceTitle : messages.copyUnavailable;
    copyButton.textContent = messages.copySource;

    zoomOutButton.disabled = !hasSvg;
    zoomInButton.disabled = !hasSvg;
    zoomLabelButton.disabled = !hasSvg;
    fitButton.disabled = !hasSvg;
    zoomOutButton.title = hasSvg ? messages.zoomOut : messages.zoomDisabled;
    zoomInButton.title = hasSvg ? messages.zoomIn : messages.zoomDisabled;
    zoomLabelButton.title = hasSvg ? messages.zoomReset : messages.zoomDisabled;
    fitButton.title = hasSvg ? messages.zoomFit : messages.zoomDisabled;

    const canExport = hasSvg && (canSaveFile() || clipboard);
    const busy = exporting !== null;
    exportButton.disabled = busy || !canExport;
    exportPngButton.disabled = busy || !canExport;
    exportButton.textContent = exporting === "svg" ? messages.exportInProgress : messages.exportSvg;
    exportPngButton.textContent = exporting === "png" ? messages.exportInProgress : messages.exportPng;
    const noExportCapability = hasSvg && !canExport;
    exportButton.title = noExportCapability ? messages.exportUnavailable : messages.exportSvgTitle;
    exportPngButton.title = noExportCapability ? messages.exportUnavailable : messages.exportPngTitle;
    const zoomText = formatZoom(currentZoom);
    zoomLabelButton.textContent = zoomText;
    zoomLabelButton.setAttribute(
      "aria-label",
      formatMessage(messages.zoomCurrent, { zoom: zoomText })
    );
  }

  function paint(): void {
    messages = getMessages(getLocale());
    document.title = messages.workbenchTitle;

    editorTitle.textContent = messages.editorTitle;
    previewTitle.textContent = messages.previewTitle;
    editor.setPlaceholder(messages.editorPlaceholder);
    editor.setAriaLabel(messages.editorAriaLabel);

    sampleSelect.setAttribute("aria-label", messages.sampleLabel);
    sampleSelect.replaceChildren();
    const placeholder = new Option(messages.samplePlaceholder, "");
    placeholder.disabled = true;
    placeholder.selected = true;
    sampleSelect.append(placeholder);
    for (const sample of MERMAID_SAMPLES) {
      sampleSelect.append(new Option(messages[sample.labelKey], sample.id));
    }
    sampleSelect.value = "";

    themeSelect.setAttribute("aria-label", messages.themeLabel);
    themeSelect.title = messages.themeTitle;
    themeSelect.replaceChildren();
    for (const theme of PREVIEW_THEMES) {
      themeSelect.append(new Option(messages[theme.labelKey], theme.id));
    }
    themeSelect.value = previewThemeId;
    applyPreviewSurface();

    replaceConfirm.textContent = messages.sampleReplaceConfirm;
    replaceCancel.textContent = messages.sampleReplaceCancel;
    if (pendingSample !== null) {
      replaceText.textContent = formatMessage(messages.sampleReplaceBody, {
        name: messages[pendingSample.labelKey]
      });
    }

    emptyTitle.textContent = messages.emptyPreviewTitle;
    emptyBody.textContent = messages.emptyPreviewBody;
    errorRetry.textContent = messages.errorRetry;
    exportLabel.textContent = messages.exportLabel;
    exportButton.textContent = exporting === "svg" ? messages.exportInProgress : messages.exportSvg;
    exportPngButton.textContent = exporting === "png" ? messages.exportInProgress : messages.exportPng;
    exportButton.setAttribute("aria-label", messages.exportSvgTitle);
    exportPngButton.setAttribute("aria-label", messages.exportPngTitle);
    splitDivider.setLabels({
      sideBySide: messages.splitDividerSideBySide,
      stacked: messages.splitDividerStacked,
      resetHint: messages.splitResetHint
    });
    zoomOutButton.setAttribute("aria-label", messages.zoomOut);
    zoomInButton.setAttribute("aria-label", messages.zoomIn);
    fitButton.textContent = "⤢";
    fitButton.setAttribute("aria-label", messages.zoomFit);

    const fullscreenText = fullscreen ? messages.fullscreenExit : messages.fullscreenEnter;
    fullscreenButton.textContent = fullscreenText;
    fullscreenButton.setAttribute("aria-label", fullscreenText);
    fullscreenButton.title = fullscreenText;
    fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
    fullscreenHint.textContent = messages.fullscreenHint;
    fullscreenHint.hidden = !fullscreen;
    canvas.setLabels({
      viewport: messages.canvasViewport,
      panGroup: messages.canvasPanGroup,
      panUp: messages.panUp,
      panDown: messages.panDown,
      panLeft: messages.panLeft,
      panRight: messages.panRight,
      panFit: messages.zoomFit
    });

    paintError();
    updateMeta();
    updateOverlays();
    updateActionStates();
    paintStatus();
  }

  function scheduleRender(): void {
    if (debounceTimer !== undefined) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      debounceTimer = undefined;
      requestRender();
    }, RENDER_DEBOUNCE_MS);
  }

  function requestRender(): void {
    if (debounceTimer !== undefined) {
      window.clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    const myRevision = ++revision;
    queue = queue.then(() => performRender(myRevision)).catch(() => undefined);
  }

  /**
   * Re-render the last successful diagram when only the palette changed.
   * Without this, a stale diagram keeps the previous theme's node colors and
   * can end up unreadable on the new canvas (e.g. light nodes on ink).
   */
  async function repaintStaleDiagram(): Promise<void> {
    if (lastGoodSource === null) {
      return;
    }
    const resolved = resolvePreviewTheme(previewThemeId, getAppearance());
    if (resolved.mermaidTheme === renderedPalette) {
      return;
    }
    const outcome = await renderMermaid(lastGoodSource, resolved.mermaidTheme);
    if (disposed || !outcome.ok) {
      return;
    }
    canvas.show(outcome.svg);
    renderedPalette = resolved.mermaidTheme;
    updateOverlays();
    updateActionStates();
  }

  /** Queue a stale-diagram repaint, but only while an error keeps it on screen. */
  function scheduleStaleRepaint(): void {
    if (errorState === null || !canvas.hasSvg()) {
      return;
    }
    queue = queue.then(() => repaintStaleDiagram()).catch(() => undefined);
  }

  async function performRender(myRevision: number): Promise<void> {
    if (disposed || myRevision !== revision) {
      return;
    }

    const raw = editor.getValue();
    const prepared = prepareSource(raw);
    if (disposed || myRevision !== revision) {
      return;
    }

    try {
      if (!prepared.ok) {
        if (prepared.problem === "empty") {
          diagramType = null;
          lastDurationMs = null;
          errorState = null;
          canvas.clear();
          lastGoodSource = null;
          renderedPalette = null;
          setState("empty");
          paintError();
          updateMeta();
          updateOverlays();
          updateActionStates();
          return;
        }
        errorState = { kind: "policy", problem: prepared.problem };
        diagramType = detectDiagramType(raw);
        lastDurationMs = null;
        setState("error");
        paintError();
        updateMeta();
        updateOverlays();
        updateActionStates();
        return;
      }

      diagramType = prepared.diagramType;
      lastDurationMs = null;
      updateMeta();
      setState(isRendererLoaded() ? "rendering" : "loading");
      updateOverlays();

      const resolvedTheme = resolvePreviewTheme(previewThemeId, getAppearance());
      const outcome = await renderMermaid(prepared.source, resolvedTheme.mermaidTheme);
      if (disposed || myRevision !== revision) {
        return;
      }

      if (!outcome.ok) {
        errorState = { kind: "render", info: outcome.error };
        setState("error");
        paintError();
        updateOverlays();
        updateActionStates();
        return;
      }

      errorState = null;
      lastDurationMs = outcome.durationMs;
      canvas.show(outcome.svg);
      lastGoodSource = prepared.source;
      renderedPalette = resolvedTheme.mermaidTheme;
      setState("ready");
      paintError();
      updateMeta();
      updateOverlays();
      updateActionStates();
    } catch (error) {
      errorState = { kind: "render", info: normalizeRenderError(error, raw, "unknown") };
      setState("error");
      paintError();
      updateOverlays();
      updateActionStates();
    }
  }

  function handleEditorChange(): void {
    revision += 1;
    errorState = null;
    lastDurationMs = null;
    paintError();

    if (editor.getValue().trim() === "") {
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
      diagramType = null;
      canvas.clear();
      setState("empty");
      paintStatus();
      updateMeta();
      updateOverlays();
      updateActionStates();
      return;
    }

    diagramType = detectDiagramType(editor.getValue());
    setState("rendering");
    updateMeta();
    updateOverlays();
    scheduleRender();
  }

  function showReplaceBar(sample: MermaidSample): void {
    replaceBar.hidden = false;
    replaceText.textContent = formatMessage(messages.sampleReplaceBody, {
      name: messages[sample.labelKey]
    });
    replaceConfirm.textContent = messages.sampleReplaceConfirm;
    replaceCancel.textContent = messages.sampleReplaceCancel;
    replaceCancel.focus();
  }

  function hideReplaceBar(focusSelect = false): void {
    replaceBar.hidden = true;
    pendingSample = null;
    if (focusSelect) {
      sampleSelect.focus();
    }
  }

  function loadSample(sample: MermaidSample): void {
    hideReplaceBar();
    editor.setValue(sample.source);
    lastSampleSource = sample.source;
    diagramType = sample.diagramType;
    lastDurationMs = null;
    errorState = null;
    setState("rendering");
    paintError();
    updateMeta();
    updateOverlays();
    requestRender();
    editor.focus();
  }

  function handleSampleChange(): void {
    const id = sampleSelect.value;
    sampleSelect.value = "";
    if (id === "") {
      return;
    }
    const sample = findSample(id);
    if (sample === undefined) {
      return;
    }
    const current = editor.getValue();
    if (current.trim() !== "" && current !== lastSampleSource) {
      pendingSample = sample;
      showReplaceBar(sample);
      return;
    }
    loadSample(sample);
  }

  async function handleCopy(): Promise<void> {
    try {
      await copySource(editor.getValue());
      showNotice(messages.copiedSource);
    } catch {
      showNotice(messages.copyFailed);
    }
  }

  function pngNotice(result: PngSaveResult): string {
    switch (result.kind) {
      case "saved":
        return messages.exportedPng;
      case "canceled":
        return messages.exportCanceled;
      case "copiedSvg":
        return result.reason === "no-save"
          ? messages.exportPngNoSaveCopied
          : messages.exportPngRasterFailedCopied;
    }
  }

  async function handleExport(kind: ExportKind): Promise<void> {
    const svg = canvas.getSvg();
    if (svg === null || exporting !== null) {
      return;
    }
    exporting = kind;
    updateActionStates();
    try {
      if (kind === "svg") {
        const outcome = await saveSvg(svg);
        showNotice(
          outcome === "saved"
            ? messages.exportedSvg
            : outcome === "canceled"
              ? messages.exportCanceled
              : messages.exportFallbackCopied
        );
        return;
      }
      const theme = resolvePreviewTheme(previewThemeId, getAppearance());
      const result = await savePng(svg, { background: previewBackgroundColor(theme) });
      showNotice(pngNotice(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotice(formatMessage(messages.exportFailed, { message }));
    } finally {
      exporting = null;
      updateActionStates();
    }
  }

  function handleThemeChange(): void {
    const value = themeSelect.value;
    if (!isPreviewThemeId(value)) {
      themeSelect.value = previewThemeId;
      return;
    }
    if (value === previewThemeId) {
      return;
    }
    previewThemeId = value;
    applyPreviewSurface();
    // A stale diagram keeps the previous palette, which can be unreadable on the
    // new canvas, so repaint it even though the current source still fails.
    scheduleStaleRepaint();
    // Keep zoom / fit state: only the SVG is re-rendered.
    requestRender();
  }

  function handleZoomChange(next: CanvasZoomState): void {
    currentZoom = next.zoom;
    const zoomText = formatZoom(next.zoom);
    zoomLabelButton.textContent = zoomText;
    zoomLabelButton.setAttribute(
      "aria-label",
      formatMessage(messages.zoomCurrent, { zoom: zoomText })
    );
  }

  /** View-scoped immersive fullscreen: only this plugin's own DOM is affected. */
  function setFullscreen(next: boolean, trigger?: HTMLElement | null): void {
    if (fullscreen === next) {
      return;
    }
    if (next) {
      const active = document.activeElement;
      fullscreenTrigger = trigger ?? (active instanceof HTMLElement ? active : null);
    }
    fullscreen = next;
    section.dataset.fullscreen = next ? "true" : "false";

    const text = next ? messages.fullscreenExit : messages.fullscreenEnter;
    fullscreenButton.textContent = text;
    fullscreenButton.setAttribute("aria-label", text);
    fullscreenButton.title = text;
    fullscreenButton.setAttribute("aria-pressed", String(next));
    fullscreenHint.textContent = messages.fullscreenHint;
    fullscreenHint.hidden = !next;

    if (next) {
      fullscreenButton.focus({ preventScroll: true });
      return;
    }
    const target = fullscreenTrigger;
    fullscreenTrigger = null;
    if (target !== null && target.isConnected && target !== document.activeElement) {
      target.focus({ preventScroll: true });
    }
  }

  function handleEnvironmentChange(): void {
    messages = getMessages(getLocale());
    paint();
    // An `auto` theme resolves to a different Mermaid palette when the host
    // flips appearance, so a stale diagram needs the same repaint as a switch.
    scheduleStaleRepaint();
    requestRender();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.shiftKey && (event.key === "f" || event.key === "F")) {
      event.preventDefault();
      setFullscreen(!fullscreen);
      return;
    }
    if (modifier && event.key === "0") {
      event.preventDefault();
      canvas.fit();
      return;
    }
    if (modifier && (event.key === "=" || event.key === "+")) {
      event.preventDefault();
      canvas.zoomBy(ZOOM_STEP);
      return;
    }
    if (modifier && event.key === "-") {
      event.preventDefault();
      canvas.zoomBy(1 / ZOOM_STEP);
      return;
    }
    // While fullscreen, the replacement bar is hidden, so Esc exits directly.
    if (event.key === "Escape" && !replaceBar.hidden && !fullscreen) {
      event.preventDefault();
      hideReplaceBar(true);
      return;
    }
    if (event.key === "Escape" && fullscreen) {
      event.preventDefault();
      event.stopPropagation();
      setFullscreen(false);
    }
  }

  sampleSelect.addEventListener("change", handleSampleChange, { signal: controller.signal });
  themeSelect.addEventListener("change", handleThemeChange, { signal: controller.signal });
  copyButton.addEventListener("click", () => void handleCopy(), { signal: controller.signal });
  exportButton.addEventListener("click", () => void handleExport("svg"), {
    signal: controller.signal
  });
  exportPngButton.addEventListener("click", () => void handleExport("png"), {
    signal: controller.signal
  });
  fullscreenButton.addEventListener("click", () => setFullscreen(!fullscreen, fullscreenButton), {
    signal: controller.signal
  });
  zoomOutButton.addEventListener("click", () => canvas.zoomBy(1 / ZOOM_STEP), {
    signal: controller.signal
  });
  zoomInButton.addEventListener("click", () => canvas.zoomBy(ZOOM_STEP), {
    signal: controller.signal
  });
  zoomLabelButton.addEventListener("click", () => canvas.setZoom(1), {
    signal: controller.signal
  });
  fitButton.addEventListener("click", () => canvas.fit(), { signal: controller.signal });
  errorRetry.addEventListener("click", () => requestRender(), { signal: controller.signal });
  replaceConfirm.addEventListener(
    "click",
    () => {
      const sample = pendingSample;
      hideReplaceBar();
      if (sample !== null) {
        loadSample(sample);
      }
    },
    { signal: controller.signal }
  );
  replaceCancel.addEventListener("click", () => hideReplaceBar(true), {
    signal: controller.signal
  });
  section.addEventListener("keydown", handleKeyDown, { signal: controller.signal });

  const defaultSample = getDefaultSample();
  editor.setValue(defaultSample.source);
  lastSampleSource = defaultSample.source;
  diagramType = defaultSample.diagramType;
  paint();
  setState("rendering");
  updateMeta();
  updateOverlays();
  updateActionStates();
  const offEnvironment = onEnvironmentChange(handleEnvironmentChange);
  requestRender();

  return {
    destroy() {
      disposed = true;
      revision += 1;
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
      clearNoticeTimer();
      offEnvironment();
      controller.abort();
      editor.destroy();
      canvas.destroy();
      splitDivider.destroy();
      section.remove();
    }
  };
}
