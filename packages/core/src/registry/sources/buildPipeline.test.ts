import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { runCatalogBuildPipeline } from "./buildPipeline.js";

let tmpPaths: string[] = [];

const serviceConfig = `id: demo-llm
name: Demo LLM
slug: demo-llm
category: llm
description: Demo LLM provider.
url: https://example.com
tags:
  - llm
capability:
  - prompt
config:
  urls:
    homepage: https://example.com
  freeTier:
    status: free_tier
    summary: Demo free tier.
    confidence: medium
`;

const markdown = `# free-for-dev

## Generative AI

* [Groq](https://groq.com/) - Fast inference API with a free tier.
`;

const groqServiceConfig = `id: groq
name: Groq
slug: groq
category: llm
description: Fast inference API.
url: https://groq.com
tags:
  - llm
capability:
  - prompt
  - config
config:
  urls:
    homepage: https://groq.com
  freeTier:
    status: free_tier
    summary: Free tier.
    confidence: medium
`;

describe("catalog build pipeline", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("runs refresh, review summary, runtime artifact generation, and validation", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-pipeline-"));
    tmpPaths.push(cwd);
    await mkdir(join(cwd, "registry", "configs"), { recursive: true });
    await writeFile(join(cwd, "registry", "configs", "demo.yaml"), serviceConfig, "utf8");

    const summary = await runCatalogBuildPipeline({
      cwd,
      now: "2026-05-13T00:00:00.000Z",
      fetchText: () => Promise.resolve({
        text: markdown,
        etag: "pipeline-etag",
        commitSha: "pipeline-commit"
      })
    });

    expect(summary).toMatchObject({
      source: "free-for-dev",
      imported: 1,
      updated: 1,
      skipped: 0,
      needsReview: 1,
      accepted: 0,
      rejected: 0,
      warnings: 0,
      errors: 0,
      stale: false,
      runtimeServiceCount: 1
    });
    expect(await readFile(join(cwd, "registry", "sources", "free-for-dev", "source.json"), "utf8"))
      .toContain("pipeline-etag");
    expect(await readFile(join(cwd, "registry", "sources", "free-for-dev", "normalized.json"), "utf8"))
      .toContain("needs_review");
    expect(await readFile(join(cwd, "registry", "catalog", "services.json"), "utf8"))
      .toContain("demo-llm");
    expect(JSON.stringify(summary)).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("writes enrichment output into committed source artifacts during the build pipeline", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-pipeline-enrich-"));
    tmpPaths.push(cwd);
    await mkdir(join(cwd, "registry", "configs"), { recursive: true });
    await writeFile(join(cwd, "registry", "configs", "demo.yaml"), serviceConfig, "utf8");

    const summary = await runCatalogBuildPipeline({
      cwd,
      now: "2026-05-13T00:00:00.000Z",
      fetchText: () => Promise.resolve({
        text: markdown
      }),
      enrichItem: () => Promise.resolve({
        status: "completed",
        method: "agent",
        urls: {
          docs: "https://groq.com/docs",
          apiKeys: "https://groq.com/keys"
        },
        setupHints: ["Use GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234 only as a placeholder."],
        envKeyHints: [
          { key: "GROQ_API_KEY", kind: "api_key", required: true, confidence: "medium" }
        ],
        warnings: ["Verify API key URL manually."]
      })
    });

    const normalized = await readFile(join(cwd, "registry", "sources", "free-for-dev", "normalized.json"), "utf8");
    const snapshot = await readFile(join(cwd, summary.source === "free-for-dev"
      ? "registry/sources/free-for-dev/snapshots/20260513T000000000Z.json"
      : ""), "utf8");

    expect(normalized).toContain("\"enrichment\"");
    expect(normalized).toContain("https://groq.com/docs");
    expect(normalized).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(snapshot).toContain("\"enrichment\"");
    expect(summary.needsReview).toBe(1);
  });

  it("matches free-for-dev candidates to manual configs without copying config fields", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-pipeline-merge-"));
    tmpPaths.push(cwd);
    await mkdir(join(cwd, "registry", "configs"), { recursive: true });
    await writeFile(join(cwd, "registry", "configs", "groq.yaml"), groqServiceConfig, "utf8");

    await runCatalogBuildPipeline({
      cwd,
      now: "2026-05-13T00:00:00.000Z",
      fetchText: () => Promise.resolve({ text: markdown })
    });

    const normalized = await readFile(join(cwd, "registry", "sources", "free-for-dev", "normalized.json"), "utf8");

    expect(normalized).toContain("\"matchedServiceId\": \"groq\"");
    expect(normalized).toContain("\"capability\": [\n        \"prompt\"\n      ]");
    expect(normalized).not.toContain("GROQ_API_KEY");
  });
});
