import type { Mermaid, MermaidConfig } from "mermaid";
import type { DOMPurify as Purifier } from "dompurify";
import { MAX_RENDER_EDGES, MAX_SOURCE_CHARS } from "./constants";
import { normalizeRenderError, type RenderErrorInfo } from "./errors";
import type { MermaidThemeName } from "./themes";

interface RendererModules {
  mermaid: Mermaid;
  purify: Purifier;
}

let rendererPromise: Promise<RendererModules> | null = null;
let renderCounter = 0;

export class SvgSecurityError extends Error {
  constructor(message = "Unsafe SVG output") {
    super(message);
    this.name = "SvgSecurityError";
  }
}

function loadRenderer(): Promise<RendererModules> {
  if (rendererPromise === null) {
    rendererPromise = Promise.all([import("mermaid"), import("dompurify")])
      .then(([mermaidModule, purifyModule]) => ({
        mermaid: mermaidModule.default,
        purify: purifyModule.default
      }))
      .catch((error: unknown) => {
        // Allow a later retry to load the chunks again.
        rendererPromise = null;
        throw error;
      });
  }
  return rendererPromise;
}

export function isRendererLoaded(): boolean {
  return rendererPromise !== null;
}

export function preloadRenderer(): Promise<void> {
  return loadRenderer().then(() => undefined);
}

function getFontFamily(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
  return value || "Inter, ui-sans-serif, system-ui, sans-serif";
}

function createConfig(theme: MermaidThemeName): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    htmlLabels: false,
    theme,
    fontFamily: getFontFamily(),
    flowchart: {
      htmlLabels: false,
      useMaxWidth: false
    },
    maxTextSize: MAX_SOURCE_CHARS,
    maxEdges: MAX_RENDER_EDGES,
    suppressErrorRendering: true,
    logLevel: "fatal"
  };
}

function sanitizeSvg(purify: Purifier, svgText: string): SVGSVGElement {
  const fragment = purify.sanitize(svgText, {
    RETURN_DOM_FRAGMENT: true,
    ADD_ATTR: ["dominant-baseline"],
    FORBID_TAGS: ["script", "foreignobject", "iframe", "object", "embed", "image"]
  }) as unknown as DocumentFragment;

  const svg = fragment.querySelector("svg");
  if (svg === null) {
    throw new SvgSecurityError("Sanitized SVG output is missing");
  }
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return svg as SVGSVGElement;
}

const FORBIDDEN_TAGS = new Set(["script", "foreignobject", "iframe", "object", "embed", "image"]);
const URL_ATTRIBUTES = new Set(["href", "xlink:href", "src"]);
const CSS_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;

function assertCssUrls(css: string): void {
  for (const match of css.matchAll(CSS_URL)) {
    const target = (match[2] ?? "").trim();
    if (!target.startsWith("#")) {
      throw new SvgSecurityError(`External CSS url is not allowed: ${target.slice(0, 60)}`);
    }
  }
}

function assertSafeSvg(svg: SVGSVGElement): void {
  const elements = [svg, ...Array.from(svg.querySelectorAll("*"))];
  for (const element of elements) {
    const tag = element.tagName.toLowerCase();
    if (FORBIDDEN_TAGS.has(tag)) {
      throw new SvgSecurityError(`Forbidden SVG element: ${tag}`);
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) {
        throw new SvgSecurityError(`Event handler attribute is not allowed: ${name}`);
      }
      if (URL_ATTRIBUTES.has(name)) {
        const value = attribute.value.trim();
        if (value !== "" && !value.startsWith("#")) {
          throw new SvgSecurityError(`External URL is not allowed: ${value.slice(0, 60)}`);
        }
      }
      if (name === "style") {
        if (/javascript:/i.test(attribute.value)) {
          throw new SvgSecurityError("javascript: style is not allowed");
        }
        assertCssUrls(attribute.value);
      }
    }

    if (tag === "style") {
      const css = element.textContent ?? "";
      if (/@import|javascript:/i.test(css)) {
        throw new SvgSecurityError("External or scriptable CSS is not allowed");
      }
      assertCssUrls(css);
    }
  }
}

export type RenderOutcome =
  | { ok: true; svg: SVGSVGElement; durationMs: number }
  | { ok: false; error: RenderErrorInfo };

export async function renderMermaid(
  source: string,
  theme: MermaidThemeName
): Promise<RenderOutcome> {
  const started = performance.now();
  let modules: RendererModules;
  try {
    modules = await loadRenderer();
  } catch (error) {
    return { ok: false, error: normalizeRenderError(error, source, "load") };
  }

  try {
    modules.mermaid.initialize(createConfig(theme));
    await modules.mermaid.parse(source);
    const id = `dbx-mermaid-${++renderCounter}`;
    const result = await modules.mermaid.render(id, source);
    const svg = sanitizeSvg(modules.purify, result.svg);
    assertSafeSvg(svg);
    return {
      ok: true,
      svg,
      durationMs: Math.max(0, performance.now() - started)
    };
  } catch (error) {
    const kind = error instanceof SvgSecurityError ? "security" : "parse";
    return { ok: false, error: normalizeRenderError(error, source, kind) };
  }
}
