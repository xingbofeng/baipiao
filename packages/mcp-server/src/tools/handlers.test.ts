import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { MemoryVaultService } from "baipiao-core";
import { createMcpToolHandlers } from "./handlers.js";
import { forbiddenMcpToolNames, mcpToolNames } from "./index.js";

let tmpPaths: string[] = [];

describe("MCP tool handlers", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("lists full free-for-dev catalog candidates by default without secret values", async () => {
    const handlers = createMcpToolHandlers({ vault: new MemoryVaultService() });

    const output = await handlers.list_services({ query: "openruter", limit: 5 });

    expect(output.detectedLanguage).toBe("en");
    expect(output.services).toContainEqual(expect.objectContaining({
      id: "free-for-dev:generative-ai:openrouter",
      name: "OpenRouter"
    }));
    expect(JSON.stringify(output)).not.toContain("gsk_");
  });

  it("detects localized catalog search language and matches full catalog candidates", async () => {
    const handlers = createMcpToolHandlers({ vault: new MemoryVaultService() });

    const zh = await handlers.list_services({ query: "数据库" });
    const es = await handlers.list_services({ query: "base de datos" });

    expect(zh.detectedLanguage).toBe("zh-CN");
    expect(zh.services).toContainEqual(expect.objectContaining({ category: "database" }));
    expect(es.detectedLanguage).toBe("es");
    expect(es.services).toContainEqual(expect.objectContaining({ category: "database" }));
  });

  it("lists and filters full free-for-dev catalog candidates", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-mcp-candidates-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);
    const handlers = createMcpToolHandlers({ cwd, vault: new MemoryVaultService() });

    const output = await handlers.list_free_catalog_candidates({
      query: "演示",
      category: "llm",
      locale: "zh-CN"
    });
    const categories = await handlers.get_free_catalog_categories({});

    expect(output).toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          id: "free-for-dev:generative-ai:demo-ai",
          name: "演示 AI",
          category: "llm",
          locale: "zh-CN",
          translationStatus: "translated"
        })
      ],
      source: {
        id: "free-for-dev",
        stale: false
      }
    });
    expect(categories.categories).toContainEqual({ id: "llm", name: "llm", count: 1 });
    expect(categories.sourceCategories).toContainEqual({ id: "generative-ai", name: "Generative AI", count: 1 });
    expect(JSON.stringify(output)).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("detects candidate query language and system locale for full free-for-dev catalog candidates", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-mcp-auto-locale-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);
    const handlers = createMcpToolHandlers({ cwd, vault: new MemoryVaultService() });

    await expect(handlers.list_free_catalog_candidates({ query: "デモ", limit: 1 })).resolves.toMatchObject({
      requestedLocale: "ja"
    });
    await expect(handlers.list_free_catalog_candidates({ query: "데모", limit: 1 })).resolves.toMatchObject({
      requestedLocale: "ko"
    });
    await expect(handlers.list_free_catalog_candidates({ query: "service gratuit", limit: 1 })).resolves.toMatchObject({
      requestedLocale: "fr"
    });
    await expect(handlers.list_free_catalog_candidates({ query: "servicio gratis", limit: 1 })).resolves.toMatchObject({
      requestedLocale: "es"
    });
    await expect(handlers.list_free_catalog_candidates({ systemLocale: "zh_CN.UTF-8", limit: 1 })).resolves.toMatchObject({
      requestedLocale: "zh-CN"
    });
  });

  it("applies offline translations for full free-for-dev catalog candidates", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-mcp-localize-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);
    const handlers = createMcpToolHandlers({ cwd, vault: new MemoryVaultService() });

    const summary = await handlers.apply_free_catalog_translations({
      locale: "ko",
      translations: [
        {
          id: "free-for-dev:web-hosting:static-host",
          name: "정적 호스트",
          description: "무료 정적 호스팅.",
          freeTierText: "무료 정적 사이트 플랜."
        }
      ]
    });
    const output = await handlers.list_free_catalog_candidates({
      query: "정적"
    });

    expect(summary).toEqual({ updated: 1, missing: [] });
    expect(output).toMatchObject({
      requestedLocale: "ko",
      items: [
        expect.objectContaining({
          id: "free-for-dev:web-hosting:static-host",
          name: "정적 호스트",
          translationStatus: "translated"
        })
      ]
    });
  });

  it("returns untranslated free-for-dev translation batches", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-mcp-translation-batch-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);
    const handlers = createMcpToolHandlers({ cwd, vault: new MemoryVaultService() });

    const output = await handlers.get_free_catalog_translation_batch({
      locale: "zh-CN",
      limit: 10
    });

    expect(output).toMatchObject({
      locale: "zh-CN",
      total: 1,
      untranslatedOnly: true,
      items: [
        {
          id: "free-for-dev:web-hosting:static-host",
          source: {
            name: "Static Host",
            description: "Free static hosting.",
            freeTierText: "Free static site plan."
          }
        }
      ]
    });
  });

  it("returns service info and setup prompt contracts", async () => {
    const handlers = createMcpToolHandlers({ vault: new MemoryVaultService() });

    await expect(handlers.get_service_info({ serviceId: "groq" })).resolves.toMatchObject({
      service: {
        id: "groq",
        name: "Groq",
        env: [expect.objectContaining({ key: "GROQ_API_KEY", secret: true })]
      }
    });

    await expect(handlers.generate_setup_prompt({ serviceId: "groq", projectSlug: "mcp-app" })).resolves.toMatchObject({
      serviceId: "groq",
      serviceName: "Groq",
      mode: "structured",
      outputFormat: ["GROQ_API_KEY=..."],
      requiredEnvKeys: ["GROQ_API_KEY"],
      capability: ["prompt", "config", "test"]
    });
  });

  it("generates generic setup prompts for free-for-dev normalized candidates", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-mcp-candidate-"));
    tmpPaths.push(cwd);
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, "normalized.json"), `${JSON.stringify({
      items: [
        {
          id: "free-for-dev:generative-ai:demo-ai",
          name: "Demo AI",
          slug: "demo-ai",
          category: "llm",
          sourceCategory: "Generative AI",
          description: "Demo free AI API.",
          url: "https://example.com",
          capability: ["prompt"],
          freeTierText: "Free tier available with review.",
          freeTierStatus: "free_tier",
          source: {
            id: "free-for-dev",
            url: "https://github.com/ripienaar/free-for-dev",
            rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
            importedAt: "2026-05-13T00:00:00.000Z"
          },
          rawExcerptRef: {
            path: "registry/sources/free-for-dev/raw/sample.md",
            lineStart: 1,
            lineEnd: 1
          },
          confidence: "medium",
          reviewStatus: "needs_review",
          warnings: ["External source requires manual review."]
        }
      ]
    }, null, 2)}\n`, "utf8");
    const handlers = createMcpToolHandlers({ cwd, vault: new MemoryVaultService() });

    const output = await handlers.generate_setup_prompt({
      serviceId: "free-for-dev:generative-ai:demo-ai",
      projectSlug: "candidate-app"
    });

    expect(output).toMatchObject({
      serviceId: "free-for-dev:generative-ai:demo-ai",
      serviceName: "Demo AI",
      mode: "generic",
      reviewStatus: "needs_review",
      requiredEnvKeys: [],
      source: {
        id: "free-for-dev"
      }
    });
    expect(output.prompt).toContain("https://example.com");
    expect(output.prompt).toContain("Free tier available with review.");
    expect(output.prompt).toContain("External source requires manual review.");
    expect(output.prompt).toContain("KEY=VALUE");
    expect(JSON.stringify(output)).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("parses agent output without returning secret cleartext", () => {
    const handlers = createMcpToolHandlers({ vault: new MemoryVaultService() });

    const output = handlers.parse_agent_output({
      serviceId: "groq",
      text: "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234"
    });

    expect(output.entries).toEqual([
      expect.objectContaining({
        key: "GROQ_API_KEY",
        secret: true,
        maskedValue: "gsk_**************************1234",
        valid: true
      })
    ]);
    expect(JSON.stringify(output)).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });

  it("lists vault public metadata and rejects forbidden tools", async () => {
    const vault = new MemoryVaultService();
    await vault.set("GROQ_API_KEY", "gsk_abcdefghijklmnopqrstuvwxyz1234", { serviceId: "groq" });
    const handlers = createMcpToolHandlers({ vault });

    await expect(handlers.vault_list({})).resolves.toEqual({
      entries: [
        expect.objectContaining({
          key: "GROQ_API_KEY",
          serviceId: "groq",
          status: "stored",
          scope: "server"
        })
      ]
    });
    expect(JSON.stringify(await handlers.vault_list({}))).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    for (const toolName of forbiddenMcpToolNames) {
      await expect(handlers.callForbiddenTool(toolName)).rejects.toMatchObject({
        code: "MCP_TOOL_FAILED",
        message: `Forbidden MCP tool is not available: ${toolName}`
      });
    }
  });

  it("enumerates all expected forbidden tool names", () => {
    expect(forbiddenMcpToolNames).toEqual([
      "vault_reveal",
      "get_secret_value",
      "browser_click",
      "browser_type",
      "shell_exec",
      "read_any_file",
      "write_any_file",
      "delete_file",
      "upload_secret"
    ]);
  });

  it("implements every allowlisted tool contract without returning secret cleartext", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-mcp-"));
    tmpPaths.push(cwd);
    const vault = new MemoryVaultService();
    let copied = false;
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const handlers = createMcpToolHandlers({
      cwd,
      vault,
      writeClipboard: () => {
        copied = true;
        return Promise.resolve();
      },
      testFetch: (url, init) => {
        requests.push({ url: String(url), init });
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
    });
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";

    expect(mcpToolNames.every((name) => typeof handlers[name] === "function")).toBe(true);
    await expect(handlers.validate_secret({ key: "GROQ_API_KEY", value: secret })).resolves.toMatchObject({
      key: "GROQ_API_KEY",
      valid: true
    });
    await expect(handlers.vault_set({ key: "GROQ_API_KEY", value: secret, serviceId: "groq" })).resolves.toEqual({
      key: "GROQ_API_KEY",
      saved: true,
      serviceId: "groq"
    });
    await expect(handlers.save_agent_output({ serviceId: "groq", text: `GROQ_API_KEY=${secret}` })).resolves
      .toMatchObject({
        saved: [expect.objectContaining({ key: "GROQ_API_KEY", maskedValue: "gsk_**************************1234" })],
        state: "tested",
        testResult: { status: "passed", ok: true }
      });
    expect(requests[0]?.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(JSON.stringify(requests[0]?.init?.headers)).toContain(`Bearer ${secret}`);
    await expect(handlers.vault_import({ text: "API Key: sk-or-v1-abcdefghijklmnopqrstuvwxyz1234", serviceId: "openrouter" }))
      .resolves.toMatchObject({
        saved: [expect.objectContaining({ key: "API_KEY" })],
        failed: []
      });
    await expect(handlers.vault_copy({ key: "GROQ_API_KEY" })).resolves.toEqual({
      key: "GROQ_API_KEY",
      copied: true
    });
    expect(copied).toBe(true);
    const exampleEnv = await handlers.generate_env({ path: ".env.example", example: true });
    expect(exampleEnv.path).toBe(".env.example");
    expect(exampleEnv.writtenKeys).toContain("GROQ_API_KEY");
    expect(exampleEnv.missingKeys).toEqual([]);
    expect(await readFile(join(cwd, ".env.example"), "utf8")).toContain("GROQ_API_KEY=");
    await expect(handlers.test_connection({ serviceId: "vercel" })).resolves.toMatchObject({
      serviceId: "vercel",
      ok: true,
      status: "skipped"
    });
    const status = await handlers.get_status({});
    expect(status.project).toEqual({ cwd });
    expect(status.vault.storedCount).toBeGreaterThan(0);
    expect(Array.isArray(status.services)).toBe(true);
    expect(handlers.recommend_stack({ useCase: "ai_saas" })).toMatchObject({
      stack: {
        projectType: "ai_saas"
      }
    });
    await expect(handlers.vault_remove({ key: "GROQ_API_KEY" })).resolves.toEqual({
      key: "GROQ_API_KEY",
      removed: true
    });

    const outputs = await Promise.all([
      handlers.vault_list({}),
      handlers.vault_health({}),
      handlers.generate_env({ path: ".env.local" })
    ]);
    expect(JSON.stringify(outputs)).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });

  it("marks save_agent_output as failed when its connection test fails", async () => {
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const handlers = createMcpToolHandlers({
      vault: new MemoryVaultService(),
      testFetch: () => Promise.resolve(new Response("unauthorized", { status: 401 }))
    });

    const output = await handlers.save_agent_output({ serviceId: "groq", text: `GROQ_API_KEY=${secret}` });

    expect(output).toMatchObject({
      saved: [expect.objectContaining({ key: "GROQ_API_KEY", maskedValue: "gsk_**************************1234" })],
      failed: [],
      state: "failed",
      testResult: {
        status: "failed",
        ok: false,
        message: "OpenAI-compatible chat test failed with status 401."
      }
    });
    expect(JSON.stringify(output)).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });

  it("runs connection tests with Vault env values without returning secret cleartext", async () => {
    const vault = new MemoryVaultService();
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    await vault.set("GROQ_API_KEY", secret, { serviceId: "groq" });
    const handlers = createMcpToolHandlers({
      vault,
      testFetch: (url, init) => {
        requests.push({ url: String(url), init });
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
    });

    const result = await handlers.test_connection({ serviceId: "groq" });

    expect(result).toMatchObject({
      serviceId: "groq",
      ok: true,
      status: "passed"
    });
    expect(requests[0]?.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(JSON.stringify(requests[0]?.init?.headers)).toContain(`Bearer ${secret}`);
    expect(JSON.stringify(result)).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });
});

async function writeNormalizedCatalogFixture(cwd: string): Promise<void> {
  const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
  await mkdir(sourceDir, { recursive: true });
  await writeFile(join(sourceDir, "normalized.json"), `${JSON.stringify({
    schemaVersion: "baipiao.normalized-catalog.v1",
    generatedAt: "2026-05-13T00:00:00.000Z",
    source: {
      id: "free-for-dev",
      name: "free-for-dev",
      url: "https://github.com/ripienaar/free-for-dev",
      rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
      license: "unknown",
      fetchedAt: "2026-05-13T00:00:00.000Z",
      stale: false
    },
    parser: { name: "free-for-dev-markdown", version: "1" },
    stats: {
      categoryCount: 2,
      parsedItemCount: 2,
      skippedItemCount: 0,
      warningCount: 0
    },
    items: [
      normalizedCandidate({
        id: "free-for-dev:generative-ai:demo-ai",
        name: "Demo AI",
        slug: "demo-ai",
        category: "llm",
        sourceCategory: "Generative AI",
        description: "Free LLM gateway.",
        freeTierText: "Free model credits.",
        enrichment: {
          localization: {
            "zh-CN": {
              name: "演示 AI",
              description: "免费的 LLM 网关。",
              freeTierText: "免费模型额度。",
              status: "translated"
            }
          }
        }
      }),
      normalizedCandidate({
        id: "free-for-dev:web-hosting:static-host",
        name: "Static Host",
        slug: "static-host",
        category: "hosting",
        sourceCategory: "Web Hosting",
        description: "Free static hosting.",
        freeTierText: "Free static site plan."
      })
    ]
  }, null, 2)}\n`, "utf8");
}

function normalizedCandidate(overrides: {
  id: string;
  name: string;
  slug: string;
  category: string;
  sourceCategory: string;
  description: string;
  freeTierText: string;
  enrichment?: unknown;
}) {
  return {
    id: overrides.id,
    name: overrides.name,
    slug: overrides.slug,
    category: overrides.category,
    sourceCategory: overrides.sourceCategory,
    description: overrides.description,
    url: "https://example.com",
    capability: ["prompt"],
    freeTierText: overrides.freeTierText,
    freeTierStatus: "free_tier",
    source: {
      id: "free-for-dev",
      url: "https://github.com/ripienaar/free-for-dev",
      rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
      importedAt: "2026-05-13T00:00:00.000Z"
    },
    rawExcerptRef: {
      path: "registry/sources/free-for-dev/raw/sample.md",
      lineStart: 1,
      lineEnd: 1
    },
    confidence: "medium",
    reviewStatus: "needs_review",
    matchedServiceId: null,
    warnings: [],
    ...(overrides.enrichment ? { enrichment: overrides.enrichment } : {})
  };
}
