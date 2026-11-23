import { element } from "../lib/dom";

export interface SourceEditorOptions {
  placeholder: string;
  ariaLabel: string;
  onChange: () => void;
  onRenderRequest: () => void;
}

export interface SourceEditorHandle {
  element: HTMLElement;
  getValue(): string;
  setValue(value: string): void;
  focus(): void;
  setPlaceholder(text: string): void;
  setAriaLabel(text: string): void;
  destroy(): void;
}

export function createSourceEditor(options: SourceEditorOptions): SourceEditorHandle {
  const root = element("div", "editor");
  const gutter = element("div", "editor__gutter");
  gutter.setAttribute("aria-hidden", "true");
  const textarea = element("textarea", "editor__input");
  textarea.wrap = "off";
  textarea.spellcheck = false;
  textarea.autocomplete = "off";
  textarea.setAttribute("autocapitalize", "off");
  textarea.setAttribute("placeholder", options.placeholder);
  textarea.setAttribute("aria-label", options.ariaLabel);
  root.append(gutter, textarea);

  const controller = new AbortController();
  let lastLineCount = -1;

  const syncGutter = (force = false): void => {
    const lines = Math.max(1, textarea.value.split("\n").length);
    if (force || lines !== lastLineCount) {
      const parts: string[] = [];
      for (let index = 1; index <= lines; index += 1) {
        parts.push(String(index));
      }
      gutter.textContent = parts.join("\n");
      gutter.style.width = `calc(${String(lines).length}ch + 26px)`;
      lastLineCount = lines;
    }
    gutter.scrollTop = textarea.scrollTop;
  };

  textarea.addEventListener(
    "input",
    () => {
      syncGutter();
      options.onChange();
    },
    { signal: controller.signal }
  );

  textarea.addEventListener(
    "scroll",
    () => {
      gutter.scrollTop = textarea.scrollTop;
    },
    { signal: controller.signal }
  );

  textarea.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.setRangeText("  ", start, end, "end");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        options.onRenderRequest();
      }
    },
    { signal: controller.signal }
  );

  syncGutter(true);

  return {
    element: root,
    getValue() {
      return textarea.value;
    },
    setValue(value: string) {
      textarea.value = value;
      syncGutter(true);
      textarea.scrollTop = 0;
      gutter.scrollTop = 0;
      textarea.setSelectionRange(0, 0);
    },
    focus() {
      textarea.focus();
    },
    setPlaceholder(text: string) {
      textarea.setAttribute("placeholder", text);
    },
    setAriaLabel(text: string) {
      textarea.setAttribute("aria-label", text);
    },
    destroy() {
      controller.abort();
      root.remove();
    }
  };
}
