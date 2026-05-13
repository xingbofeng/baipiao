import { describe, expect, it } from "vitest";

import {
  buildRegistryViewModel,
  filterRegistryItems,
  getLocalizedSourceCategory,
  getLocalizedRegistryItem,
  getPopularRegistryItems,
  paginateRegistryItems,
  type FreeForDevRegistryData
} from "./free-for-dev.js";

const fixture: FreeForDevRegistryData = {
  schemaVersion: "baipiao.free-for-dev.normalized.v1",
  generatedAt: "2026-05-13T12:53:02.040Z",
  source: {
    id: "free-for-dev",
    url: "https://github.com/ripienaar/free-for-dev",
    rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
    importedAt: "2026-05-12T12:08:50.953Z"
  },
  parser: {
    name: "free-for-dev-markdown"
  },
  stats: {
    categoryCount: 3,
    parsedItemCount: 4,
    skippedItemCount: 1,
    warningCount: 2
  },
  items: [
    {
      id: "free-for-dev:cloud:google-cloud-platform",
      name: "Google Cloud Platform",
      slug: "google-cloud-platform",
      category: "unknown",
      sourceCategory: "Major Cloud Providers",
      description: "",
      url: "https://cloud.google.com",
      capability: ["prompt"],
      freeTierText: "Free tier details require review.",
      freeTierStatus: "unknown",
      source: {
        id: "free-for-dev",
        url: "https://github.com/ripienaar/free-for-dev",
        rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
        importedAt: "2026-05-12T12:08:50.953Z"
      },
      rawExcerptRef: {
        path: "registry/sources/free-for-dev/raw/20260512T120850953Z.md",
        lineStart: 78,
        lineEnd: 78
      },
      confidence: "medium",
      reviewStatus: "needs_review",
      matchedServiceId: null,
      warnings: ["Unknown source category: Major Cloud Providers"],
      enrichment: {
        localization: {
          "zh-CN": {
            name: "Google Cloud Platform",
            description: "",
            freeTierText: "免费额度还需进一步确认。",
            status: "translated",
            reviewStatus: "needs_review",
            translatedAt: "2026-05-13T16:10:12.271Z"
          }
        }
      }
    },
    {
      id: "free-for-dev:cloud:google-colab",
      name: "Google Colab",
      slug: "google-colab",
      category: "unknown",
      sourceCategory: "Major Cloud Providers",
      description: "Free Jupyter Notebooks development environment.",
      url: "https://colab.research.google.com/",
      capability: ["prompt"],
      freeTierText: "Free Jupyter Notebooks development environment.",
      freeTierStatus: "free_tier",
      source: {
        id: "free-for-dev",
        url: "https://github.com/ripienaar/free-for-dev",
        rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
        importedAt: "2026-05-12T12:08:50.953Z"
      },
      rawExcerptRef: {
        path: "registry/sources/free-for-dev/raw/20260512T120850953Z.md",
        lineStart: 79,
        lineEnd: 79
      },
      confidence: "medium",
      reviewStatus: "needs_review",
      matchedServiceId: null,
      warnings: []
    },
    {
      id: "free-for-dev:api:apify",
      name: "Apify",
      slug: "apify",
      category: "unknown",
      sourceCategory: "APIs, Data, and ML",
      description: "Web scraping and automation platform.",
      url: "https://www.apify.com/",
      capability: ["prompt"],
      freeTierText: "Free plan with monthly platform credits.",
      freeTierStatus: "free_tier",
      source: {
        id: "free-for-dev",
        url: "https://github.com/ripienaar/free-for-dev",
        rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
        importedAt: "2026-05-12T12:08:50.953Z"
      },
      rawExcerptRef: {
        path: "registry/sources/free-for-dev/raw/20260512T120850953Z.md",
        lineStart: 124,
        lineEnd: 124
      },
      confidence: "medium",
      reviewStatus: "needs_review",
      matchedServiceId: null,
      warnings: []
    },
    {
      id: "free-for-dev:cms:contentful",
      name: "Contentful",
      slug: "contentful",
      category: "unknown",
      sourceCategory: "CMS",
      description: "Headless CMS.",
      url: "https://www.contentful.com/",
      capability: ["prompt"],
      freeTierText: "One free Community space.",
      freeTierStatus: "limited_free",
      source: {
        id: "free-for-dev",
        url: "https://github.com/ripienaar/free-for-dev",
        rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
        importedAt: "2026-05-12T12:08:50.953Z"
      },
      rawExcerptRef: {
        path: "registry/sources/free-for-dev/raw/20260512T120850953Z.md",
        lineStart: 201,
        lineEnd: 201
      },
      confidence: "medium",
      reviewStatus: "needs_review",
      matchedServiceId: null,
      warnings: []
    }
  ]
};

describe("free-for-dev registry view model", () => {
  it("summarizes source categories and quality counters for a large registry", () => {
    const viewModel = buildRegistryViewModel(fixture);

    expect(viewModel.summary).toEqual({
      itemCount: 4,
      sourceCategoryCount: 3,
      freeTierCount: 2,
      unknownTierCount: 1,
      limitedFreeCount: 1,
      needsReviewCount: 4,
      warningCount: 2,
      generatedAt: "2026-05-13T12:53:02.040Z",
      importedAt: "2026-05-12T12:08:50.953Z"
    });
    expect(viewModel.sourceCategories.slice(0, 3)).toEqual([
      { name: "All services", count: 4 },
      { name: "Major Cloud Providers", count: 2 },
      { name: "APIs, Data, and ML", count: 1 }
    ]);
  });

  it("filters by source category, tier status, review status, and query text", () => {
    const filtered = filterRegistryItems(fixture.items, {
      sourceCategory: "APIs, Data, and ML",
      freeTierStatus: "free_tier",
      reviewStatus: "needs_review",
      query: "monthly credits"
    });

    expect(filtered.map((item) => item.name)).toEqual(["Apify"]);
  });

  it("uses localized item fields when available", () => {
    expect(getLocalizedRegistryItem(fixture.items[0]!, "zh-CN").freeTierText).toBe("免费额度还需进一步确认。");
    expect(getLocalizedRegistryItem(fixture.items[1]!, "zh-CN").description).toBe("Free Jupyter Notebooks development environment.");
  });

  it("searches localized descriptions and free-tier summaries", () => {
    const filtered = filterRegistryItems(fixture.items, {
      query: "免费额度",
      locale: "zh-CN"
    });

    expect(filtered.map((item) => item.name)).toEqual(["Google Cloud Platform"]);
  });

  it("localizes source category labels for the docs UI", () => {
    expect(getLocalizedSourceCategory("Storage and Media Processing", "zh-CN")).toBe("存储与媒体处理");
    expect(getLocalizedSourceCategory("APIs, Data, and ML", "zh-CN")).toBe("API、数据与机器学习");
    expect(getLocalizedSourceCategory("Major Cloud Providers", "ja")).toBe("主要クラウドプロバイダー");
    expect(getLocalizedSourceCategory("Storage and Media Processing", "ko")).toBe("스토리지 및 미디어 처리");
    expect(getLocalizedSourceCategory("APIs, Data, and ML", "fr")).toBe("API, données et ML");
    expect(getLocalizedSourceCategory("Web Hosting", "es")).toBe("Hosting web");
    expect(getLocalizedSourceCategory("APIs, Data, and ML", "en")).toBe("APIs, Data, and ML");
  });

  it("selects curated popular services from the full registry when present", () => {
    const popular = getPopularRegistryItems([
      { ...fixture.items[2]!, id: "free-for-dev:hosting:vercel", name: "Vercel", slug: "vercel" },
      { ...fixture.items[2]!, id: "free-for-dev:api:apify", name: "Apify", slug: "apify" }
    ]);

    expect(popular.map((item) => item.slug)).toEqual(["vercel"]);
  });

  it("paginates filtered registry rows without dropping total count", () => {
    const page = paginateRegistryItems(fixture.items, { page: 2, pageSize: 2 });

    expect(page.total).toBe(4);
    expect(page.totalPages).toBe(2);
    expect(page.items.map((item) => item.name)).toEqual(["Apify", "Contentful"]);
  });
});
