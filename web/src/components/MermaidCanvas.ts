import { CANVAS_PADDING, KEY_PAN_STEP, PAN_STEP } from "../lib/constants";
import {
  anchoredScrollDelta,
  clampZoom,
  horizontalWheelDelta,
  normalizeWheelDelta,
  panDelta,
  zoomFactorFromPixels,
  type PanDirection,
  type Point
} from "../lib/canvasMath";
import { button, element, getSvgViewBoxSize } from "../lib/dom";

export interface CanvasZoomState {
  zoom: number;
  fit: boolean;
}

export interface CanvasLabels {
  viewport: string;
  panGroup: string;
  panUp: string;
  panDown: string;
  panLeft: string;
  panRight: string;
  panFit: string;
}

export interface MermaidCanvasOptions {
  onZoomChange?: (state: CanvasZoomState) => void;
  labels?: CanvasLabels;
}

export interface MermaidCanvasHandle {
  element: HTMLElement;
  show(svg: SVGSVGElement): void;
  clear(): void;
  fit(): void;
  setZoom(zoom: number): void;
  zoomBy(factor: number): void;
  panBy(direction: PanDirection): void;
  setLabels(labels: CanvasLabels): void;
  getSvg(): SVGSVGElement | null;
  hasSvg(): boolean;
  destroy(): void;
}

const PAN_LABEL_KEYS: Record<PanDirection, keyof CanvasLabels> = {
  up: "panUp",
  down: "panDown",
  left: "panLeft",
  right: "panRight"
};

const PAN_GLYPHS: Record<PanDirection, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→"
};

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
}

const DEFAULT_LABELS: CanvasLabels = {
  viewport: "Diagram canvas",
  panGroup: "Canvas pan controls",
  panUp: "Pan up",
  panDown: "Pan down",
  panLeft: "Pan left",
  panRight: "Pan right",
  panFit: "Fit to window"
};

export function createMermaidCanvas(options: MermaidCanvasOptions = {}): MermaidCanvasHandle {
  const root = element("div", "canvas");
  const viewport = element("div", "canvas__viewport");
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "group");
  const stage = element("div", "canvas__stage");
  viewport.append(stage);

  const panPad = element("div", "canvas__pan");
  panPad.setAttribute("role", "group");
  const panButtons: Array<{ direction: PanDirection; button: HTMLButtonElement }> = [];
  for (const direction of ["up", "left", "right", "down"] as const) {
    const control = button(PAN_GLYPHS[direction], `canvas__pan-btn canvas__pan-btn--${direction}`);
    panButtons.push({ direction, button: control });
    panPad.append(control);
  }
  const panFitButton = button("⤢", "canvas__pan-btn canvas__pan-btn--fit");
  panPad.append(panFitButton);

  const controller = new AbortController();
  let labels = options.labels ?? DEFAULT_LABELS;
  let currentSvg: SVGSVGElement | null = null;
  let natural = { width: 800, height: 600 };
  let zoom = 1;
  let fitMode = true;
  let hasShown = false;
  let resizeFrame: number | undefined;
  let wheelFrame: number | undefined;
  let wheelPixels = 0;
  let wheelAnchor: Point = { x: 0, y: 0 };
  let drag: DragState | null = null;

  const notify = (): void => {
    options.onZoomChange?.({ zoom, fit: fitMode });
  };

  const measure = (svg: SVGSVGElement): void => {
    const size = getSvgViewBoxSize(svg);
    if (size !== null) {
      natural = size;
      return;
    }
    try {
      const box = svg.getBBox();
      if (box.width > 0 && box.height > 0) {
        natural = { width: box.width, height: box.height };
        return;
      }
    } catch {
      // Detached or hidden SVG: keep the fallback size.
    }
    natural = { width: 800, height: 600 };
  };

  const applyZoom = (): void => {
    if (currentSvg === null) {
      return;
    }
    const width = Math.max(1, Math.round(natural.width * zoom));
    const height = Math.max(1, Math.round(natural.height * zoom));
    currentSvg.setAttribute("width", String(width));
    currentSvg.setAttribute("height", String(height));
    currentSvg.style.width = `${width}px`;
    currentSvg.style.height = `${height}px`;

    const centered =
      width + CANVAS_PADDING * 2 < viewport.clientWidth &&
      height + CANVAS_PADDING * 2 < viewport.clientHeight;
    stage.classList.toggle("canvas__stage--center", centered);
    notify();
  };

  const fitInternal = (): void => {
    if (currentSvg === null) {
      return;
    }
    const availableWidth = viewport.clientWidth - CANVAS_PADDING * 2;
    const availableHeight = viewport.clientHeight - CANVAS_PADDING * 2;
    if (availableWidth <= 0 || availableHeight <= 0) {
      return;
    }
    const scale = Math.min(availableWidth / natural.width, availableHeight / natural.height);
    zoom = clampZoom(scale);
    fitMode = true;
    applyZoom();
  };

  const scheduleFit = (): void => {
    if (resizeFrame !== undefined) {
      return;
    }
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = undefined;
      if (currentSvg === null) {
        return;
      }
      if (fitMode) {
        fitInternal();
      } else {
        // A fullscreen toggle changes the viewport: refresh centering without
        // touching the user's zoom level or scroll position.
        applyZoom();
      }
    });
  };

  const observer =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => scheduleFit());
  observer?.observe(viewport);

  const updatePanButtons = (): void => {
    const disabled = currentSvg === null;
    for (const entry of panButtons) {
      entry.button.disabled = disabled;
    }
    panFitButton.disabled = disabled;
  };

  function pan(direction: PanDirection, step = PAN_STEP): void {
    if (currentSvg === null) {
      return;
    }
    const delta = panDelta(direction, step);
    viewport.scrollLeft += delta.x;
    viewport.scrollTop += delta.y;
  }

  function setLabels(next: CanvasLabels): void {
    labels = next;
    viewport.setAttribute("aria-label", labels.viewport);
    panPad.setAttribute("aria-label", labels.panGroup);
    for (const entry of panButtons) {
      const text = labels[PAN_LABEL_KEYS[entry.direction]];
      entry.button.setAttribute("aria-label", text);
      entry.button.title = text;
    }
    panFitButton.setAttribute("aria-label", labels.panFit);
    panFitButton.title = labels.panFit;
  }

  for (const entry of panButtons) {
    entry.button.addEventListener("click", () => pan(entry.direction), {
      signal: controller.signal
    });
  }
  panFitButton.addEventListener("click", () => fitInternal(), { signal: controller.signal });
  root.append(viewport, panPad);
  setLabels(labels);
  updatePanButtons();

  const resetDrag = (): void => {
    if (
      drag !== null &&
      typeof viewport.hasPointerCapture === "function" &&
      viewport.hasPointerCapture(drag.pointerId)
    ) {
      viewport.releasePointerCapture(drag.pointerId);
    }
    drag = null;
    viewport.classList.remove("canvas__viewport--dragging");
  };

  const endDrag = (event: PointerEvent): void => {
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }
    resetDrag();
  };

  const applyWheelZoom = (): void => {
    const pixels = wheelPixels;
    wheelPixels = 0;
    if (currentSvg === null || pixels === 0) {
      return;
    }
    const before = currentSvg.getBoundingClientRect();
    const previousZoom = zoom;
    const next = clampZoom(zoom * zoomFactorFromPixels(pixels));
    if (next === previousZoom) {
      return;
    }
    zoom = next;
    fitMode = false;
    applyZoom();
    const after = currentSvg.getBoundingClientRect();
    const delta = anchoredScrollDelta(before, after, wheelAnchor, previousZoom, zoom);
    viewport.scrollLeft += delta.x;
    viewport.scrollTop += delta.y;
  };

  viewport.addEventListener(
    "wheel",
    (event) => {
      if (currentSvg === null) {
        return;
      }
      // Wheel zoom owns the vertical gesture; browsing a large diagram uses
      // drag panning, Shift+wheel, the directional pad, arrow keys or scrollbars.
      event.preventDefault();
      const height = viewport.clientHeight || 600;
      if (event.shiftKey) {
        viewport.scrollLeft += horizontalWheelDelta(
          event.deltaX,
          event.deltaY,
          event.deltaMode,
          height
        );
        return;
      }
      wheelPixels += normalizeWheelDelta(event.deltaY, event.deltaMode, height);
      wheelAnchor = { x: event.clientX, y: event.clientY };
      if (wheelFrame === undefined) {
        wheelFrame = window.requestAnimationFrame(() => {
          wheelFrame = undefined;
          applyWheelZoom();
        });
      }
    },
    { passive: false, signal: controller.signal }
  );

  viewport.addEventListener(
    "mousedown",
    (event) => {
      // Suppress middle-click autoscroll so the pointer drag owns panning.
      if (event.button === 1) {
        event.preventDefault();
      }
    },
    { signal: controller.signal }
  );

  viewport.addEventListener(
    "dragstart",
    (event) => {
      event.preventDefault();
    },
    { signal: controller.signal }
  );

  viewport.addEventListener(
    "pointerdown",
    (event) => {
      if (currentSvg === null || drag !== null || event.pointerType === "touch") {
        return;
      }
      if (event.button !== 0 && event.button !== 1) {
        return;
      }
      // Do not preventDefault on the left button: it would suppress the
      // compatibility mouse events that power dblclick-to-fit.
      if (event.button === 1) {
        event.preventDefault();
      }
      viewport.focus({ preventScroll: true });
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop
      };
      try {
        viewport.setPointerCapture(event.pointerId);
      } catch {
        // The pointer may already be gone on older WebView2 builds.
      }
      viewport.classList.add("canvas__viewport--dragging");
    },
    { signal: controller.signal }
  );

  viewport.addEventListener(
    "pointermove",
    (event) => {
      if (drag === null || event.pointerId !== drag.pointerId) {
        return;
      }
      viewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
      viewport.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    },
    { signal: controller.signal }
  );

  viewport.addEventListener("pointerup", endDrag, { signal: controller.signal });
  viewport.addEventListener("pointercancel", endDrag, { signal: controller.signal });
  viewport.addEventListener("lostpointercapture", endDrag, { signal: controller.signal });

  viewport.addEventListener(
    "dblclick",
    (event) => {
      if (currentSvg === null) {
        return;
      }
      event.preventDefault();
      fitInternal();
    },
    { signal: controller.signal }
  );

  viewport.addEventListener(
    "keydown",
    (event) => {
      if (currentSvg === null || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      let delta: Point | null = null;
      switch (event.key) {
        case "ArrowUp":
          delta = panDelta("up", KEY_PAN_STEP);
          break;
        case "ArrowDown":
          delta = panDelta("down", KEY_PAN_STEP);
          break;
        case "ArrowLeft":
          delta = panDelta("left", KEY_PAN_STEP);
          break;
        case "ArrowRight":
          delta = panDelta("right", KEY_PAN_STEP);
          break;
        default:
          return;
      }
      event.preventDefault();
      viewport.scrollLeft += delta.x;
      viewport.scrollTop += delta.y;
    },
    { signal: controller.signal }
  );

  return {
    element: root,
    show(svg) {
      currentSvg = svg;
      svg.style.display = "block";
      svg.style.maxWidth = "none";
      stage.replaceChildren(svg);
      measure(svg);
      if (!hasShown) {
        hasShown = true;
        fitMode = true;
      }
      updatePanButtons();
      if (fitMode) {
        fitInternal();
      } else {
        applyZoom();
      }
    },
    clear() {
      resetDrag();
      if (wheelFrame !== undefined) {
        window.cancelAnimationFrame(wheelFrame);
        wheelFrame = undefined;
      }
      wheelPixels = 0;
      currentSvg = null;
      stage.replaceChildren();
      stage.classList.remove("canvas__stage--center");
      zoom = 1;
      fitMode = true;
      hasShown = false;
      updatePanButtons();
      notify();
    },
    fit() {
      fitInternal();
    },
    setZoom(next) {
      if (currentSvg === null) {
        return;
      }
      zoom = clampZoom(next);
      fitMode = false;
      applyZoom();
    },
    zoomBy(factor) {
      if (currentSvg === null) {
        return;
      }
      zoom = clampZoom(zoom * factor);
      fitMode = false;
      applyZoom();
    },
    panBy(direction) {
      pan(direction);
    },
    setLabels,
    getSvg() {
      return currentSvg;
    },
    hasSvg() {
      return currentSvg !== null;
    },
    destroy() {
      resetDrag();
      controller.abort();
      observer?.disconnect();
      if (resizeFrame !== undefined) {
        window.cancelAnimationFrame(resizeFrame);
      }
      if (wheelFrame !== undefined) {
        window.cancelAnimationFrame(wheelFrame);
      }
      stage.replaceChildren();
      currentSvg = null;
      root.remove();
    }
  };
}
