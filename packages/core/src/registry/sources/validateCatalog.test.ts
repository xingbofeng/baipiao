import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { runCatalogBuildPipeline } from "./buildPipeline.js";
import { validateCatalogArtifacts } from "./validateCatalog.js";

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

describe("catalog validation", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("validates runtime and normalized source artifacts and rejects secret-looking content", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-validate-"));
    tmpPaths.push(cwd);
    await mkdir(join(cwd, "registry", "configs"), { recursive: true });
    await writeFile(join(cwd, "registry", "configs", "demo.yaml"), serviceConfig, "utf8");
    await runCatalogBuildPipeline({
      cwd,
      now: "2026-05-13T00:00:00.000Z",
      fetchText: () => Promise.resolve({ text: markdown })
    });

    await expect(validateCatalogArtifacts({ cwd })).resolves.toBeUndefined();

    await writeFile(join(cwd, "registry", "sources", "free-for-dev", "source.json"), JSON.stringify({
      name: "free-for-dev",
      rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
      leaked: "gsk_live_should_not_exist"
    }), "utf8");

    await expect(validateCatalogArtifacts({ cwd })).rejects.toThrow("secret values");
  });
});
