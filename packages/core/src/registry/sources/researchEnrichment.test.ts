import { describe, expect, it } from "vitest";

import { normalizeFreeForDevMarkdown } from "./normalizer.js";
import {
  createResearchEnrichmentProvider,
  type ResearchEnrichmentCache,
  type ResearchEnrichmentCacheEntry,
  type ResearchExtractedContent,
  type ResearchSearchRequest,
  type ResearchSearchResult
} from "./researchEnrichment.js";

const markdown = `# free-for-dev

## Generative AI

* [Demo AI](https://example.com) - Free tier available.
`;

const now = "2026-05-13T00:00:00.000Z";

describe("research enrichment provider", () => {
  it("searches, extracts, and synthesizes multi-source service notes without saving secret examples", async () => {
    const item = normalizedItem();
    const requests: ResearchSearchRequest[] = [];
    const provider = createResearchEnrichmentProvider({
      now: () => now,
      search: (request) => {
        requests.push(request);
        return Promise.resolve(searchResultsByTarget[request.target] ?? []);
      },
      extract: ({ result }) => Promise.resolve(extractedContentByUrl[result.url] ?? {
        url: result.url,
        ...(result.title ? { title: result.title } : {}),
        text: ""
      })
    });

    const enrichment = await provider.enrichItem(item);

    expect(requests.map((request) => request.target)).toEqual([
      "homepage",
      "docs",
      "console",
      "api_keys",
      "pricing"
    ]);
    expect(enrichment).toMatchObject({
      status: "partial",
      method: "agent",
      generatedAt: now,
      urls: {
        homepage: "https://example.com",
        docs: "https://example.com/docs",
        console: "https://console.example.com",
        apiKeys: "https://console.example.com/api-keys",
        pricing: "https://example.com/pricing"
      },
      envKeyHints: [
        { key: "DEMO_API_KEY", kind: "api_key", required: true, confidence: "medium" }
      ],
      freeTier: {
        status: "free_tier",
        summary: "Free developer tier is documented.",
        confidence: "medium"
      },
      reviewStatus: "needs_review"
    });
    expect(enrichment?.sources?.map((source) => source.type)).toEqual([
      "homepage",
      "docs",
      "console",
      "api_keys",
      "pricing"
    ]);
    expect(enrichment?.setupHints).toContain("Create a project and return DEMO_API_KEY=********.");
    expect(enrichment?.warnings).toContain("Conflicting docs URL candidates; kept https://example.com/docs.");
    expect(JSON.stringify(enrichment)).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });

  it("uses fresh cache entries without calling external research hooks", async () => {
    const item = normalizedItem();
    const cache = new MemoryResearchCache({
      [defaultCacheKey(item.id)]: {
        cachedAt: now,
        enrichment: {
          status: "completed",
          method: "agent",
          generatedAt: now,
          urls: {
            docs: "https://cache.example/docs"
          },
          confidence: "medium",
          reviewStatus: "needs_review"
        }
      }
    });
    const provider = createResearchEnrichmentProvider({
      now: () => now,
      cache,
      cacheTtlMs: 60_000,
      search: () => Promise.reject(new Error("search should not run for fresh cache entries")),
      extract: () => Promise.reject(new Error("extract should not run for fresh cache entries"))
    });

    await expect(provider.enrichItem(item)).resolves.toMatchObject({
      status: "completed",
      urls: {
        docs: "https://cache.example/docs"
      }
    });
  });

  it("returns stale cached enrichment when research times out", async () => {
    const item = normalizedItem();
    const cache = new MemoryResearchCache({
      [defaultCacheKey(item.id)]: {
        cachedAt: "2026-05-12T00:00:00.000Z",
        enrichment: {
          status: "completed",
          method: "agent",
          generatedAt: "2026-05-12T00:00:00.000Z",
          urls: {
            docs: "https://stale-cache.example/docs"
          },
          confidence: "low",
          reviewStatus: "needs_review"
        }
      }
    });
    const provider = createResearchEnrichmentProvider({
      now: () => now,
      cache,
      cacheTtlMs: 1,
      timeoutMs: 1,
      search: () => Promise.resolve([
        { url: "https://example.com/docs", title: "Docs", target: "docs", confidence: "medium" }
      ]),
      extract: () => new Promise<ResearchExtractedContent>(() => undefined)
    });

    await expect(provider.enrichItem(item)).resolves.toMatchObject({
      status: "stale",
      urls: {
        docs: "https://stale-cache.example/docs"
      },
      warnings: [
        "Research enrichment failed; using stale cache: extract https://example.com/docs timed out after 1ms."
      ]
    });
  });
});

function normalizedItem() {
  const normalized = normalizeFreeForDevMarkdown(markdown, {
    fetchedAt: now,
    rawSnapshotPath: "registry/sources/free-for-dev/raw/sample.md"
  });
  const item = normalized.items[0];
  if (!item) {
    throw new Error("Expected normalized fixture item.");
  }
  return item;
}

function defaultCacheKey(itemId: string): string {
  return `research:free-for-dev:${itemId}:v1`;
}

const searchResultsByTarget: Partial<Record<ResearchSearchRequest["target"], ResearchSearchResult[]>> = {
  homepage: [
    { url: "https://example.com", title: "Demo AI", target: "homepage", confidence: "medium" }
  ],
  docs: [
    { url: "https://example.com/docs", title: "Demo AI Docs", target: "docs", confidence: "high" },
    { url: "https://docs.example.com", title: "Alternate Docs", target: "docs", confidence: "low" }
  ],
  console: [
    { url: "https://console.example.com", title: "Console", target: "console", confidence: "medium" }
  ],
  api_keys: [
    { url: "https://console.example.com/api-keys", title: "API Keys", target: "api_keys", confidence: "medium" }
  ],
  pricing: [
    { url: "https://example.com/pricing", title: "Pricing", target: "pricing", confidence: "medium" }
  ]
};

const extractedContentByUrl: Record<string, ResearchExtractedContent> = {
  "https://example.com": {
    url: "https://example.com",
    title: "Demo AI",
    text: "Official homepage.",
    tags: ["llm", "api"]
  },
  "https://example.com/docs": {
    url: "https://example.com/docs",
    title: "Demo AI Docs",
    text: "Create a project and return DEMO_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234.",
    urls: {
      docs: "https://example.com/docs"
    },
    setupHints: ["Create a project and return DEMO_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234."],
    envKeyHints: [
      { key: "DEMO_API_KEY", kind: "api_key", required: true, confidence: "medium" }
    ],
    authRequirements: ["API key"],
    confidence: "medium"
  },
  "https://docs.example.com": {
    url: "https://docs.example.com",
    title: "Alternate Docs",
    text: "Older docs mirror.",
    urls: {
      docs: "https://docs.example.com"
    },
    warnings: ["Older docs mirror found."]
  },
  "https://console.example.com": {
    url: "https://console.example.com",
    title: "Console",
    text: "Sign in to create a project."
  },
  "https://console.example.com/api-keys": {
    url: "https://console.example.com/api-keys",
    title: "API Keys",
    text: "Create an API key."
  },
  "https://example.com/pricing": {
    url: "https://example.com/pricing",
    title: "Pricing",
    text: "Free developer tier is documented.",
    freeTier: {
      status: "free_tier",
      summary: "Free developer tier is documented.",
      confidence: "medium"
    }
  }
};

class MemoryResearchCache implements ResearchEnrichmentCache {
  constructor(private readonly entries: Record<string, ResearchEnrichmentCacheEntry> = {}) {}

  get(key: string): Promise<ResearchEnrichmentCacheEntry | undefined> {
    return Promise.resolve(this.entries[key]);
  }

  set(key: string, entry: ResearchEnrichmentCacheEntry): Promise<void> {
    this.entries[key] = entry;
    return Promise.resolve();
  }
}
