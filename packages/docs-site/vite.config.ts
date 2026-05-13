import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { getDocsBasePath } from "./src/app/base-path.js";

const docsSiteDir = dirname(fileURLToPath(import.meta.url));
const registryDataPath = resolve(docsSiteDir, "../../registry/sources/free-for-dev/normalized.json");
const registryPublicPath = "/registry/free-for-dev/normalized.json";

export default defineConfig({
  base: getDocsBasePath(),
  plugins: [
    react(),
    {
      name: "baipiao-registry-json",
      configureServer(server) {
        server.middlewares.use(registryPublicPath, async (_request, response) => {
          const source = await readFile(registryDataPath, "utf8");
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(source);
        });
      },
      async generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "registry/free-for-dev/normalized.json",
          source: await readFile(registryDataPath, "utf8")
        });
      }
    }
  ],
  build: {
    outDir: "dist/client",
    emptyOutDir: true
  }
});
