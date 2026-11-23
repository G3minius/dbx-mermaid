import {
  SPLIT_DEFAULT_RATIO,
  SPLIT_GUTTER_PX,
  SPLIT_KEYBOARD_LARGE_STEP,
  SPLIT_KEYBOARD_STEP,
  SPLIT_MIN_PANE_PX,
  SPLIT_MIN_ROW_PX,
  SPLIT_NARROW_BREAKPOINT_PX
} from "../lib/constants";
import {
  clampSplitRatio,
  ratioFromPointer,
  stepSplitRatio,
  type SplitOrientation
} from "../lib/splitMath";

export interface SplitLabels {
  sideBySide: string;
  stacked: string;
  resetHint: string;
}

export interface SplitDividerOptions {
  container: HTMLElement;
  editorId: string;
  previewId: string;
  labels: SplitLabels;
  onReset?: () => void;
}

export interface SplitDividerHandle {
  element: HTMLElement;
  getRatio(): number;
  setLabels(labels: SplitLabels): void;
  destroy(): void;
}

interface DragState {
  pointerId: number;
  start: number;
  size: number;
  orientation: SplitOrientation;
}

const NARROW_QUERY = `(max-width: ${SPLIT_NARROW_BREAKPOINT_PX}px)`;

/**
 * A keyboard-accessible separator between the editor and preview panes.
 * Only a CSS custom property is written; layout stays in CSS so the wide
 * (columns) and narrow (rows) breakpoints share one ratio.
 */
export function createSplitDivider(options: SplitDividerOptions): SplitDividerHandle {
  const { container, editorId, previewId } = options;
  const divider = document.createElement("div");
  divider.className = "split__divider";
  divider.tabIndex = 0;
  divider.setAttribute("role", "separator");
  divider.setAttribute("aria-controls", `${editorId} ${previewId}`);
  divider.setAttribute("aria-valuemin", "0");
  divider.setAttribute("aria-valuemax", "100");

  const controller = new AbortController();
  const query = typeof window.matchMedia === "function" ? window.matchMedia(NARROW_QUERY) : null;
  let labels = options.labels;
  let ratio = SPLIT_DEFAULT_RATIO;
  let orientation: SplitOrientation = "side-by-side";
  let drag: DragState | null = null;

  function readOrientation(): SplitOrientation {
    if (query !== null) {
      return query.matches ? "stacked" : "side-by-side";
    }
    return window.innerWidth <= SPLIT_NARROW_BREAKPOINT_PX ? "stacked" : "side-by-side";
  }

  function minPane(): number {
    return orientation === "side-by-side" ? SPLIT_MIN_PANE_PX : SPLIT_MIN_ROW_PX;
  }

  function apply(): void {
    // A percentage (not calc(ratio * 100%)) keeps compatibility with older
    // WebView2 builds that do not support multiplication inside calc().
    container.style.setProperty("--split-editor", `${(ratio * 100).toFixed(3)}%`);
    container.dataset.stacked = orientation === "stacked" ? "true" : "false";
    divider.dataset.orientation = orientation;
    divider.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    divider.setAttribute("aria-orientation", orientation === "stacked" ? "horizontal" : "vertical");
    const label = orientation === "stacked" ? labels.stacked : labels.sideBySide;
    divider.setAttribute("aria-label", label);
    divider.title = labels.resetHint === "" ? label : `${label} · ${labels.resetHint}`;
  }

  function setRatio(next: number): void {
    const rect = container.getBoundingClientRect();
    const size = orientation === "side-by-side" ? rect.width : rect.height;
    const pane = minPane();
    // Announce the reachable range, not a theoretical 0–100 that the pixel
    // minima make impossible.
    const low = clampSplitRatio(0, size, pane, SPLIT_GUTTER_PX);
    const high = clampSplitRatio(1, size, pane, SPLIT_GUTTER_PX);
    divider.setAttribute("aria-valuemin", String(Math.round(low * 100)));
    divider.setAttribute("aria-valuemax", String(Math.round(high * 100)));
    ratio = clampSplitRatio(next, size, pane, SPLIT_GUTTER_PX);
    apply();
  }

  function reset(): void {
    setRatio(SPLIT_DEFAULT_RATIO);
    options.onReset?.();
  }

  function endDrag(event?: PointerEvent): void {
    if (drag === null || (event !== undefined && event.pointerId !== drag.pointerId)) {
      return;
    }
    if (
      typeof divider.hasPointerCapture === "function" &&
      divider.hasPointerCapture(drag.pointerId)
    ) {
      divider.releasePointerCapture(drag.pointerId);
    }
    drag = null;
    container.classList.remove("split--resizing");
    divider.classList.remove("split__divider--active");
  }

  divider.addEventListener(
    "pointerdown",
    (event) => {
      if (drag !== null || (event.pointerType === "mouse" && event.button !== 0)) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const current = readOrientation();
      drag = {
        pointerId: event.pointerId,
        start: current === "side-by-side" ? rect.left : rect.top,
        size: current === "side-by-side" ? rect.width : rect.height,
        orientation: current
      };
      try {
        divider.setPointerCapture(event.pointerId);
      } catch {
        // Older WebView2 builds may refuse capture for a vanishing pointer.
      }
      container.classList.add("split--resizing");
      divider.classList.add("split__divider--active");
      divider.focus({ preventScroll: true });
    },
    { signal: controller.signal }
  );

  divider.addEventListener(
    "pointermove",
    (event) => {
      if (drag === null || event.pointerId !== drag.pointerId) {
        return;
      }
      event.preventDefault();
      const position = drag.orientation === "side-by-side" ? event.clientX : event.clientY;
      setRatio(ratioFromPointer(position, drag.start, drag.size));
    },
    { signal: controller.signal }
  );

  divider.addEventListener("pointerup", endDrag, { signal: controller.signal });
  divider.addEventListener("pointercancel", endDrag, { signal: controller.signal });
  divider.addEventListener("lostpointercapture", endDrag, { signal: controller.signal });

  divider.addEventListener(
    "dblclick",
    () => {
      reset();
    },
    { signal: controller.signal }
  );

  divider.addEventListener(
    "keydown",
    (event) => {
      const rect = container.getBoundingClientRect();
      const size = orientation === "side-by-side" ? rect.width : rect.height;
      const pane = minPane();
      let next: number | null = null;
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowUp":
          next = stepSplitRatio(ratio, -1, size, pane, SPLIT_KEYBOARD_STEP, SPLIT_GUTTER_PX);
          break;
        case "ArrowRight":
        case "ArrowDown":
          next = stepSplitRatio(ratio, 1, size, pane, SPLIT_KEYBOARD_STEP, SPLIT_GUTTER_PX);
          break;
        case "PageUp":
          next = stepSplitRatio(ratio, -1, size, pane, SPLIT_KEYBOARD_LARGE_STEP, SPLIT_GUTTER_PX);
          break;
        case "PageDown":
          next = stepSplitRatio(ratio, 1, size, pane, SPLIT_KEYBOARD_LARGE_STEP, SPLIT_GUTTER_PX);
          break;
        case "Home":
          next = clampSplitRatio(0, size, pane, SPLIT_GUTTER_PX);
          break;
        case "End":
          next = clampSplitRatio(1, size, pane, SPLIT_GUTTER_PX);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          reset();
          return;
        default:
          return;
      }
      event.preventDefault();
      setRatio(next);
    },
    { signal: controller.signal }
  );

  const handleOrientationChange = (): void => {
    orientation = readOrientation();
    setRatio(ratio);
  };
  const handleResize = (): void => {
    orientation = readOrientation();
    setRatio(ratio);
  };

  if (query !== null) {
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handleOrientationChange);
    } else if (typeof query.addListener === "function") {
      query.addListener(handleOrientationChange);
    }
  }
  window.addEventListener("resize", handleResize, { signal: controller.signal });
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          // Keep both panes above their pixel minimum after a host-side resize.
          setRatio(ratio);
        });
  observer?.observe(container);

  orientation = readOrientation();
  apply();

  return {
    element: divider,
    getRatio() {
      return ratio;
    },
    setLabels(next) {
      labels = next;
      apply();
    },
    destroy() {
      endDrag();
      controller.abort();
      observer?.disconnect();
      if (query !== null) {
        if (typeof query.removeEventListener === "function") {
          query.removeEventListener("change", handleOrientationChange);
        } else if (typeof query.removeListener === "function") {
          query.removeListener(handleOrientationChange);
        }
      }
      container.classList.remove("split--resizing");
      container.style.removeProperty("--split-editor");
      delete container.dataset.stacked;
      divider.remove();
    }
  };
}
