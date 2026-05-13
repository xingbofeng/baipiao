import { describe, expect, it } from "vitest";

import { loadServiceConfigs } from "../registry/configs.js";
import { CatalogNormalizedItemSchema, type ServiceRecord } from "../schemas/index.js";
import { generateCatalogCandidatePrompt, generateSetupPrompt } from "./generator.js";

describe("setup prompt generator", () => {
  it("renders structured Groq setup prompts with project slug replacement and safety rules", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");

    expect(groq).toBeDefined();

    const prompt = generateSetupPrompt(groq!, { projectSlug: "my-ai-tool" });

    expect(prompt).toContain("https://console.groq.com/keys");
    expect(prompt).toContain("baipiao-my-ai-tool");
    expect(prompt).toContain("GROQ_API_KEY=...");
    expect(prompt).toContain("pause and ask the user to complete it manually");
    expect(prompt).toContain("Do not click Billing, Upgrade, Payment, Subscribe, Add payment method, or enable paid features.");
  });

  it("renders generic prompt-only services without claiming structured validation", async () => {
    const services = await loadServiceConfigs();
    const vercel = services.find((service) => service.id === "vercel");

    expect(vercel).toBeDefined();

    const prompt = generateSetupPrompt(vercel!, { projectSlug: "docs-app" });

    expect(prompt).toContain("Service: Vercel");
    expect(prompt).toContain("Category: hosting");
    expect(prompt).toContain("Homepage: https://vercel.com");
    expect(prompt).toContain("Only output KEY=VALUE lines");
    expect(prompt).toContain("Do not invent unknown values.");
    expect(prompt).not.toContain("connection test is supported");
  });

  it("renders generic prompts for free-for-dev normalized candidates", () => {
    const candidate = CatalogNormalizedItemSchema.parse({
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
      warnings: ["External source requires manual review."],
      enrichment: {
        status: "completed",
        method: "agent",
        urls: {
          docs: "https://example.com/docs",
          apiKeys: "https://example.com/keys"
        },
        setupHints: ["Create a project and find developer settings."],
        envKeyHints: [
          { key: "DEMO_AI_API_KEY", kind: "api_key", required: true, confidence: "medium" }
        ],
        warnings: ["Enrichment requires review."]
      }
    });

    const prompt = generateCatalogCandidatePrompt(candidate, { projectSlug: "candidate-app" });

    expect(prompt).toContain("Demo AI");
    expect(prompt).toContain("https://example.com");
    expect(prompt).toContain("Free tier available with review.");
    expect(prompt).toContain("External source requires manual review.");
    expect(prompt).toContain("Docs: https://example.com/docs");
    expect(prompt).toContain("API keys: https://example.com/keys");
    expect(prompt).toContain("Create a project and find developer settings.");
    expect(prompt).toContain("DEMO_AI_API_KEY");
    expect(prompt).toContain("Enrichment requires review.");
    expect(prompt).toContain("KEY=VALUE");
  });

  it("maps invalid prompt inputs to PROMPT_GENERATION_FAILED", () => {
    expect(() => generateSetupPrompt({ id: "" } as ServiceRecord, { projectSlug: "demo" }))
      .toThrowError(/PROMPT_GENERATION_FAILED/);
  });
});
