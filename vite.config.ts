import { defineConfig, type Plugin } from "vite";

/**
 * The DBX dev host watches stdout for a standalone `DBX_UI_BUILD_SUCCESS`
 * line after every successful UI build. `writeBundle` runs on each rebuild
 * in watch mode, unlike `closeBundle`, which only runs when the watcher stops.
 */
function dbxBuildSignal(): Plugin {
  return {
    name: "dbx-ui-build-success",
    writeBundle() {
      console.log("DBX_UI_BUILD_SUCCESS");
    }
  };
}

export default defineConfig(() => ({
  root: "web",
  base: "./",
  plugins: [dbxBuildSignal()],
  build: {
    outDir: "../ui",
    emptyOutDir: true,
    target: "es2020",
    // DBX loads the UI in a sandboxed iframe whose CSP can block a
    // dynamically created <link rel="stylesheet">. Vite's __vitePreload
    // adds the split CSS file of every dynamic import as a dependency and
    // rejects the import when that link fails ("Unable to preload CSS"),
    // which breaks the very first render. Merging all CSS into the single
    // file linked by index.html removes those dependencies entirely.
    cssCodeSplit: false,
    // The Web/Docker host (and the dev host) are NOT Tauri runtimes: they
    // cannot use the dbx-plugin:// asset scheme, so they inline the entry
    // script into an opaque-origin srcdoc iframe with CSP
    //   default-src 'none'; script-src 'unsafe-inline' blob:; ...
    // and no <base href>. A dynamic import() from that inline module has no
    // plugin asset URL to resolve against and is blocked by CSP, so the
    // first import("mermaid") rejects with the generic "渲染引擎加载失败"
    // error. Retrying cannot fix it: the chunk is never reachable.
    // Bundling every dynamic import into the single entry makes the whole
    // UI + Mermaid + DOMPurify inline-script-only, which works on both the
    // desktop (dbx-plugin scheme) and Web/Docker hosts.
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  }
}));
