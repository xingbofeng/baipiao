import { describe, expect, it } from "vitest";

import { loadServiceConfigs } from "../configs.js";
import { normalizeFreeForDevMarkdown } from "./normalizer.js";
import { mergeNormalizedCatalogWithServiceConfigs } from "./merge.js";

const markdown = `# free-for-dev

## Generative AI

* [Groq](https://groq.com/) - Fast inference API with a free tier.
`;

describe("catalog source merge", () => {
  it("matches normalized candidates to manual configs without upgrading capability or mutating config", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");
    const originalEnv = JSON.stringify(groq?.config?.env);
    const normalized = normalizeFreeForDevMarkdown(markdown, {
      fetchedAt: "2026-05-13T00:00:00.000Z",
      rawSnapshotPath: "registry/sources/free-for-dev/raw/sample.md"
    });

    const merged = mergeNormalizedCatalogWithServiceConfigs(normalized, services);

    expect(merged.items[0]).toMatchObject({
      matchedServiceId: "groq",
      capability: ["prompt"],
      reviewStatus: "needs_review"
    });
    expect(JSON.stringify(groq?.config?.env)).toBe(originalEnv);
    expect(JSON.stringify(merged.items[0])).not.toContain("GROQ_API_KEY=secret");
  });
});
