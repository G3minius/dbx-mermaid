import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["web/src/**/*.test.ts"],
    // Vitest 5.1.0 + Node 22 on Windows can load a second copy of the runner
    // with the default "threads" pool, so every describe() throws
    // "Cannot read properties of undefined (reading 'config')".
    // The VM pool keeps a single runner instance; all suites are pure functions.
    pool: "vmThreads"
  }
});
