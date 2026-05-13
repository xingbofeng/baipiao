import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "baipiao-core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@baipiao/cli": new URL("./packages/cli/src/index.ts", import.meta.url).pathname,
      "baipiao-mcp": new URL("./packages/mcp-server/src/index.ts", import.meta.url).pathname
    }
  },
  test: {
    globals: false,
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx", "test/**/*.test.ts"],
    coverage: {
      reporter: ["text", "lcov"]
    }
  }
});
