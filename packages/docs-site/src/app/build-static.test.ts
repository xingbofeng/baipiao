import { mkdtemp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { buildStaticSite } from "./build-static.js";

let tmpPaths: string[] = [];

describe("docs static build", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("builds landing, docs root, base docs pages, and locale docs pages", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-docs-"));
    tmpPaths.push(cwd);

    await buildStaticSite({ cwd });

    await expect(readdir(join(cwd, "dist", "client"))).resolves.toContain("index.html");
    await expect(readdir(join(cwd, "dist", "client"))).resolves.toContain("en");
    await expect(readdir(join(cwd, "dist", "client"))).resolves.toContain("ja");
    await expect(readdir(join(cwd, "dist", "client"))).resolves.toContain("fr");
    await expect(readdir(join(cwd, "dist", "client", "docs"))).resolves.toContain("cli");
    await expect(readdir(join(cwd, "dist", "client", "docs"))).resolves.toContain("mcp");
    await expect(readdir(join(cwd, "dist", "client", "docs", "zh-CN"))).resolves.toContain("cli");
    await expect(readdir(join(cwd, "dist", "client", "docs", "zh-CN"))).resolves.toContain("mcp");
    await expect(readdir(join(cwd, "dist", "client", "docs", "en"))).resolves.toContain("cli");
    await expect(readdir(join(cwd, "dist", "client", "docs", "en"))).resolves.toContain("mcp");
    await expect(readdir(join(cwd, "dist", "client", "docs", "ja"))).resolves.toContain("cli");
    await expect(readdir(join(cwd, "dist", "client", "docs", "ko"))).resolves.toContain("mcp");
    await expect(readdir(join(cwd, "dist", "client", "docs", "fr"))).resolves.toContain("cli");
    await expect(readdir(join(cwd, "dist", "client", "docs", "es"))).resolves.toContain("mcp");
  });
});
