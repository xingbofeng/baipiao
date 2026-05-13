import { describe, expect, it } from "vitest";

import { formatFreeTierBadge, renderSearchView } from "./search.js";

describe("search renderer", () => {
  it("maps free tier statuses to the design badge labels", () => {
    expect(formatFreeTierBadge("free_tier")).toBe("Free Tier");
    expect(formatFreeTierBadge("limited_free")).toBe("Limited Free");
    expect(formatFreeTierBadge("paid")).toBe("Paid");
    expect(formatFreeTierBadge("unknown")).toBe("Unknown");
  });

  it("keeps the command-line brand entry without injecting the full logo", () => {
    const output = renderSearchView({
      query: "llm",
      categoryLabel: "LLM",
      results: [
        { name: "Groq", freeTierStatus: "free_tier" },
        { name: "OpenRouter", freeTierStatus: "free_tier" },
        { name: "Together AI", freeTierStatus: "limited_free" }
      ],
      quickFilters: ["database", "storage", "hosting"]
    }, { color: false, tty: true, width: 100 });

    expect(output).toContain("$ baipiao search llm");
    expect(output).not.toContain("BAIPIAO");
    expect(output).toContain("Found 3 free LLM services");
    expect(output).toContain("1. Groq");
    expect(output).toContain("Free Tier");
    expect(output).toContain("baipiao search database");
    expect(output).toContain("baipiao search storage");
    expect(output).toContain("baipiao search hosting");
  });
});
