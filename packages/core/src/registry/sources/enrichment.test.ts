import { describe, expect, it } from "vitest";

import { normalizeFreeForDevMarkdown } from "./normalizer.js";
import { applyCatalogEnrichment } from "./enrichment.js";

const markdown = `# free-for-dev

## Generative AI

* [Demo AI](https://example.com) - Free tier available.
`;

describe("catalog enrichment", () => {
  it("merges agent enrichment suggestions without upgrading capability or storing secret examples", async () => {
    const normalized = normalizeFreeForDevMarkdown(markdown, {
      fetchedAt: "2026-05-13T00:00:00.000Z",
      rawSnapshotPath: "registry/sources/free-for-dev/raw/sample.md"
    });

    const enriched = await applyCatalogEnrichment(normalized, {
      enrichItem: () => Promise.resolve({
        status: "completed",
        method: "agent",
        generatedAt: "2026-05-13T00:00:00.000Z",
        sources: [
          { url: "https://example.com/docs", type: "docs", confidence: "medium" }
        ],
        urls: {
          docs: "https://example.com/docs",
          apiKeys: "https://example.com/keys"
        },
        setupHints: ["Create a project and copy DEMO_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234"],
        envKeyHints: [
          { key: "DEMO_API_KEY", kind: "api_key", required: true, confidence: "medium" }
        ],
        confidence: "medium",
        reviewStatus: "needs_review",
        warnings: ["Agent output requires manual review."]
      })
    });

    expect(enriched.items[0]).toMatchObject({
      capability: ["prompt"],
      reviewStatus: "needs_review",
      enrichment: {
        status: "completed",
        method: "agent",
        urls: {
          docs: "https://example.com/docs",
          apiKeys: "https://example.com/keys"
        },
        envKeyHints: [
          { key: "DEMO_API_KEY", kind: "api_key", required: true, confidence: "medium" }
        ],
        warnings: ["Agent output requires manual review."]
      }
    });
    expect(JSON.stringify(enriched)).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });
});
