import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { generateCatalogArtifacts, writeCatalogArtifacts } from "./catalog.js";
import { loadServiceConfigs } from "./configs.js";

let tmpPaths: string[] = [];

describe("runtime catalog artifacts", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("generates committed runtime artifacts from reviewed service configs", async () => {
    const services = await loadServiceConfigs();
    const artifacts = generateCatalogArtifacts(services, "2026-05-12T00:00:00.000Z");

    expect(artifacts.services.map((service) => service.id)).toEqual([
      "groq",
      "openrouter",
      "gemini",
      "supabase",
      "cloudflare-r2",
      "vercel"
    ]);
    expect(artifacts.categories).toContainEqual({
      id: "llm",
      name: "LLM",
      serviceCount: 3
    });
    expect(artifacts.metadata).toMatchObject({
      schemaVersion: "baipiao.catalog.v1",
      generatedAt: "2026-05-12T00:00:00.000Z",
      serviceCount: 6
    });
    expect(JSON.stringify(artifacts)).not.toContain("gsk_live");
  });

  it("writes services, categories, and metadata json files", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-catalog-"));
    tmpPaths.push(cwd);
    const services = await loadServiceConfigs();

    await writeCatalogArtifacts({
      cwd,
      services,
      generatedAt: "2026-05-12T00:00:00.000Z"
    });

    expect(await readFile(join(cwd, "registry", "catalog", "services.json"), "utf8")).toContain('"groq"');
    expect(await readFile(join(cwd, "registry", "catalog", "categories.json"), "utf8")).toContain('"llm"');
    expect(await readFile(join(cwd, "registry", "catalog", "metadata.json"), "utf8")).toContain("baipiao.catalog.v1");
  });
});
