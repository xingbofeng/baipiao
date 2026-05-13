import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyFreeForDevCatalogTranslations,
  findFreeForDevNormalizedCandidate,
  getFreeForDevCatalogTranslationBatch,
  getFreeForDevCatalogCategories,
  refreshFreeForDevSource,
  resolveFreeForDevCatalogLocale,
  searchFreeForDevCatalog
} from "./freeForDev.js";
import { normalizeFreeForDevMarkdown } from "./normalizer.js";

const sampleMarkdown = `# free-for-dev

## Generative AI

* [Groq](https://groq.com/) - Fast inference API with a free tier for developers.
* [OpenRouter](https://openrouter.ai/) - Unified LLM gateway with free models included.

## Web Hosting

* [Vercel](https://vercel.com/) - Deploy web apps with a free plan.

## Strange Tools

* [Mystery Box](https://example.com/) - Useful thing with unclear quota.
`;

describe("free-for-dev normalizer", () => {
  it("resolves catalog locale by explicit value, input language, then system locale", () => {
    expect(resolveFreeForDevCatalogLocale({
      explicitLocale: "en",
      query: "演示"
    })).toBe("en");
    expect(resolveFreeForDevCatalogLocale({
      query: "演示"
    })).toBe("zh-CN");
    expect(resolveFreeForDevCatalogLocale({
      query: "デモ"
    })).toBe("ja");
    expect(resolveFreeForDevCatalogLocale({
      query: "데모"
    })).toBe("ko");
    expect(resolveFreeForDevCatalogLocale({
      query: "service gratuit"
    })).toBe("fr");
    expect(resolveFreeForDevCatalogLocale({
      query: "base de données"
    })).toBe("fr");
    expect(resolveFreeForDevCatalogLocale({
      query: "servicio gratis"
    })).toBe("es");
    expect(resolveFreeForDevCatalogLocale({
      query: "base de datos"
    })).toBe("es");
    expect(resolveFreeForDevCatalogLocale({
      systemLocale: "fr_FR.UTF-8"
    })).toBe("fr");
    expect(resolveFreeForDevCatalogLocale({})).toBe("en");
  });

  it("uses detected input and system locales when searching without an explicit locale", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-auto-locale-"));
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeCatalogFixture(sourceDir, [
      catalogItem({
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
      })
    ]);

    try {
      const byInput = await searchFreeForDevCatalog(cwd, { query: "演示" });
      const bySystem = await searchFreeForDevCatalog(cwd, { systemLocale: "zh_CN.UTF-8" });

      expect(byInput.items[0]).toMatchObject({
        name: "演示 AI",
        locale: "zh-CN",
        requestedLocale: "zh-CN"
      });
      expect(bySystem.items[0]).toMatchObject({
        name: "演示 AI",
        locale: "zh-CN",
        requestedLocale: "zh-CN"
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("writes imported translations into the normalized catalog localization fields", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-translate-"));
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeCatalogFixture(sourceDir, [
      catalogItem({
        id: "free-for-dev:generative-ai:demo-ai",
        name: "Demo AI",
        slug: "demo-ai",
        category: "llm",
        sourceCategory: "Generative AI",
        description: "Free LLM gateway.",
        freeTierText: "Free model credits."
      })
    ]);

    try {
      const summary = await applyFreeForDevCatalogTranslations(cwd, {
        locale: "zh-CN",
        translations: [
          {
            id: "free-for-dev:generative-ai:demo-ai",
            name: "演示 AI",
            description: "免费的 LLM 网关。",
            freeTierText: "免费模型额度。"
          }
        ],
        translatedAt: "2026-05-13T00:00:00.000Z"
      });
      const searched = await searchFreeForDevCatalog(cwd, {
        query: "演示",
        locale: "zh-CN"
      });

      expect(summary).toEqual({ updated: 1, missing: [] });
      expect(searched.items[0]).toMatchObject({
        name: "演示 AI",
        description: "免费的 LLM 网关。",
        freeTierText: "免费模型额度。",
        translationStatus: "translated"
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("preserves existing localization when refreshing upstream source data", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-refresh-locales-"));
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeCatalogFixture(sourceDir, [
      catalogItem({
        id: "free-for-dev:generative-ai:demo-ai",
        name: "Demo AI",
        slug: "demo-ai",
        category: "llm",
        sourceCategory: "Generative AI",
        description: "Old English description.",
        freeTierText: "Old free tier.",
        enrichment: {
          localization: {
            "zh-CN": {
              name: "演示 AI",
              description: "旧中文描述。",
              freeTierText: "旧免费额度。",
              status: "translated"
            }
          }
        }
      })
    ]);

    try {
      await refreshFreeForDevSource({
        cwd,
        now: "2026-05-13T00:00:00.000Z",
        fetchText: () => Promise.resolve({
          text: [
            "# free-for-dev",
            "",
            "## Generative AI",
            "",
            "* [Demo AI](https://example.com/) - New English description."
          ].join("\n"),
          etag: "refresh-etag"
        })
      });

      const searched = await searchFreeForDevCatalog(cwd, { query: "演示", locale: "zh-CN" });

      expect(searched.items[0]).toMatchObject({
        id: "free-for-dev:generative-ai:demo-ai",
        name: "演示 AI",
        description: "旧中文描述。",
        locale: "zh-CN",
        translationStatus: "translated"
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("preserves bundled localization when refreshing in a fresh project", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-refresh-bundled-locales-"));

    try {
      await refreshFreeForDevSource({
        cwd,
        now: "2026-05-13T00:00:00.000Z",
        fetchText: () => Promise.resolve({
          text: [
            "# free-for-dev",
            "",
            "## Generative AI",
            "",
            "* [OpenRouter](https://openrouter.ai/) - Unified LLM gateway with free models included."
          ].join("\n"),
          etag: "refresh-etag"
        })
      });

      const searched = await searchFreeForDevCatalog(cwd, {
        query: "openrouter",
        locale: "zh-CN"
      });

      expect(searched.items[0]).toMatchObject({
        id: "free-for-dev:generative-ai:openrouter",
        locale: "zh-CN",
        requestedLocale: "zh-CN",
        translationStatus: "translated"
      });
      expect(searched.items[0]?.description).not.toBe("Unified LLM gateway with free models included.");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("skips imported english-only locale copies and removes stale locale entries", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-prune-copy-"));
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeCatalogFixture(sourceDir, [
      catalogItem({
        id: "free-for-dev:generative-ai:demo-ai",
        name: "Demo AI",
        slug: "demo-ai",
        category: "llm",
        sourceCategory: "Generative AI",
        description: "Demo LLM gateway.",
        freeTierText: "Free LLM credits.",
        enrichment: {
          localization: {
            "zh-CN": {
              name: "Demo AI",
              description: "Demo LLM gateway.",
              freeTierText: "Free LLM credits.",
              status: "translated"
            }
          }
        }
      })
    ]);

    try {
      const summary = await applyFreeForDevCatalogTranslations(cwd, {
        locale: "zh-CN",
        translations: [
          {
            id: "free-for-dev:generative-ai:demo-ai",
            name: "Demo AI",
            description: "Demo LLM gateway.",
            freeTierText: "Free LLM credits."
          }
        ]
      });
      const searched = await searchFreeForDevCatalog(cwd, {
        locale: "zh-CN"
      });

      expect(summary).toEqual({
        updated: 0,
        missing: []
      });
      expect(searched.items[0]).toMatchObject({
        locale: "en",
        translationStatus: "fallback"
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("exports untranslated translation batches for the requested catalog locale", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-translation-batch-"));
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeCatalogFixture(sourceDir, [
      catalogItem({
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
      catalogItem({
        id: "free-for-dev:web-hosting:static-host",
        name: "Static Host",
        slug: "static-host",
        category: "hosting",
        sourceCategory: "Web Hosting",
        description: "Free static hosting.",
        freeTierText: "Free static site plan."
      })
    ]);

    try {
      const untranslated = await getFreeForDevCatalogTranslationBatch(cwd, {
        locale: "zh-CN",
        limit: 10
      });
      const all = await getFreeForDevCatalogTranslationBatch(cwd, {
        locale: "zh-CN",
        untranslatedOnly: false,
        limit: 10
      });

      expect(untranslated).toMatchObject({
        locale: "zh-CN",
        total: 1,
        limit: 10,
        offset: 0,
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
      expect(all.total).toBe(2);
      expect(all.items[0]).toMatchObject({
        id: "free-for-dev:generative-ai:demo-ai",
        existingTranslation: {
          name: "演示 AI"
        }
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("falls back to English when locale content is unchanged English", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-unchanged-locale-"));
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeCatalogFixture(sourceDir, [
      catalogItem({
        id: "free-for-dev:generative-ai:openrouter",
        name: "OpenRouter",
        slug: "openrouter",
        category: "llm",
        sourceCategory: "Generative AI",
        description: "Unified LLM gateway with free models.",
        freeTierText: "Free usage on select models.",
        enrichment: {
          localization: {
            "zh-CN": {
              name: "OpenRouter",
              description: "Unified LLM gateway with free models.",
              freeTierText: "Free usage on select models.",
              status: "translated"
            }
          }
        }
      })
    ]);

    try {
      const result = await searchFreeForDevCatalog(cwd, { locale: "zh-CN" });
      const batch = await getFreeForDevCatalogTranslationBatch(cwd, {
        locale: "zh-CN",
        limit: 10
      });

      expect(result.items[0]).toMatchObject({
        id: "free-for-dev:generative-ai:openrouter",
        locale: "en",
        requestedLocale: "zh-CN",
        translationStatus: "fallback"
      });
      expect(batch.total).toBe(1);
      expect(batch.items[0]).toMatchObject({
        id: "free-for-dev:generative-ai:openrouter",
        existingTranslation: {
          name: "OpenRouter",
          description: "Unified LLM gateway with free models.",
          freeTierText: "Free usage on select models."
        }
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("searches full free-for-dev candidates by query, category, source category, and locale", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-search-"));
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeCatalogFixture(sourceDir, [
        catalogItem({
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
        catalogItem({
          id: "free-for-dev:web-hosting:static-host",
          name: "Static Host",
          slug: "static-host",
          category: "hosting",
          sourceCategory: "Web Hosting",
          description: "Free static hosting.",
          freeTierText: "Free static site plan."
        })
      ]);

    try {
      const all = await searchFreeForDevCatalog(cwd, { limit: 10 });
      const searched = await searchFreeForDevCatalog(cwd, { query: "演示", locale: "zh-CN" });
      const fuzzy = await searchFreeForDevCatalog(cwd, { query: "dmeo ai", limit: 1 });
      const filtered = await searchFreeForDevCatalog(cwd, { category: "hosting", sourceCategory: "Web Hosting" });
      const categories = await getFreeForDevCatalogCategories(cwd);

      expect(all.total).toBe(2);
      expect(all.items.map((item) => item.id)).toEqual([
        "free-for-dev:generative-ai:demo-ai",
        "free-for-dev:web-hosting:static-host"
      ]);
      expect(searched.items).toEqual([
        expect.objectContaining({
          id: "free-for-dev:generative-ai:demo-ai",
          name: "演示 AI",
          locale: "zh-CN",
          requestedLocale: "zh-CN",
          translationStatus: "translated"
        })
      ]);
      expect(fuzzy.items).toEqual([
        expect.objectContaining({ id: "free-for-dev:generative-ai:demo-ai" })
      ]);
      expect(filtered.items).toEqual([
        expect.objectContaining({ id: "free-for-dev:web-hosting:static-host" })
      ]);
      expect(categories.categories).toEqual([
        { id: "hosting", name: "hosting", count: 1 },
        { id: "llm", name: "llm", count: 1 }
      ]);
      expect(categories.sourceCategories).toContainEqual({ id: "generative-ai", name: "Generative AI", count: 1 });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("ranks close service-name fuzzy matches before partial token matches", async () => {
    const result = await searchFreeForDevCatalog(process.cwd(), {
      query: "openruter",
      limit: 5
    });

    expect(result.items[0]).toMatchObject({
      id: "free-for-dev:generative-ai:openrouter",
      name: "OpenRouter"
    });
  });

  it("falls back to English when zh-CN localization is unavailable", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-locale-"));
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeCatalogFixture(sourceDir, [catalogItem({ id: "free-for-dev:test:demo", name: "Demo" })]);

    try {
      const result = await searchFreeForDevCatalog(cwd, { locale: "zh-CN" });

      expect(result.items[0]).toMatchObject({
        name: "Demo",
        locale: "en",
        requestedLocale: "zh-CN",
        translationStatus: "fallback"
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("loads committed normalized candidates when invoked outside the repository cwd", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-free-for-dev-outside-cwd-"));

    try {
      const candidate = await findFreeForDevNormalizedCandidate(cwd, "free-for-dev:generative-ai:openrouter");

      expect(candidate).toMatchObject({
        id: "free-for-dev:generative-ai:openrouter",
        name: "OpenRouter",
        source: {
          id: "free-for-dev"
        }
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("parses markdown bullets into baipiao-owned normalized catalog items", () => {
    const normalized = normalizeFreeForDevMarkdown(sampleMarkdown, {
      fetchedAt: "2026-05-12T00:00:00.000Z",
      rawSnapshotPath: "registry/sources/free-for-dev/raw/sample.md"
    });

    expect(normalized.schemaVersion).toBe("baipiao.normalized-catalog.v1");
    expect(normalized.source.id).toBe("free-for-dev");
    expect(normalized.parser.name).toBe("free-for-dev-markdown");
    expect(normalized.items).toHaveLength(4);

    expect(normalized.items[0]).toMatchObject({
      id: "free-for-dev:generative-ai:groq",
      name: "Groq",
      slug: "groq",
      category: "llm",
      sourceCategory: "Generative AI",
      description: "Fast inference API with a free tier for developers.",
      url: "https://groq.com/",
      capability: ["prompt"],
      freeTierStatus: "free_tier",
      confidence: "medium",
      reviewStatus: "needs_review"
    });
    expect(normalized.items[0]?.rawExcerptRef).toMatchObject({
      path: "registry/sources/free-for-dev/raw/sample.md",
      lineStart: 5,
      lineEnd: 5
    });
  });

  it("maps unknown source categories to unknown and records a review warning", () => {
    const normalized = normalizeFreeForDevMarkdown(sampleMarkdown, {
      fetchedAt: "2026-05-12T00:00:00.000Z",
      rawSnapshotPath: "registry/sources/free-for-dev/raw/sample.md"
    });

    const mystery = normalized.items.find((item) => item.slug === "mystery-box");

    expect(mystery?.category).toBe("unknown");
    expect(mystery?.warnings).toContain("Unknown source category: Strange Tools");
  });
});

async function writeCatalogFixture(sourceDir: string, items: unknown[]): Promise<void> {
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
        categoryCount: new Set(items.map((item) => isRecord(item) ? item.sourceCategory : undefined)).size,
        parsedItemCount: items.length,
        skippedItemCount: 0,
        warningCount: 0
      },
      items
    }, null, 2)}\n`, "utf8");
}

function catalogItem(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  category: string;
  sourceCategory: string;
  description: string;
  freeTierText: string;
  enrichment: unknown;
}> = {}) {
  const name = overrides.name ?? "Demo";
  const slug = overrides.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return {
    id: overrides.id ?? `free-for-dev:test:${slug}`,
    name,
    slug,
    category: overrides.category ?? "unknown",
    sourceCategory: overrides.sourceCategory ?? "Testing",
    description: overrides.description ?? "Demo description.",
    url: "https://example.com",
    capability: ["prompt"],
    freeTierText: overrides.freeTierText ?? "Free tier details.",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
