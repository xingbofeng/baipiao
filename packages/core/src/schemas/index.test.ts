import { describe, expect, it } from "vitest";

import {
  CatalogNormalizedItemSchema,
  DocsLocaleSchema,
  EnvGenerationEntrySchema,
  FailedSetupEntrySchema,
  ProjectStatusSummarySchema,
  ProjectTypeSchema,
  RecommendedStackSchema,
  SavedSetupEntrySchema,
  ServiceCapabilitySchema,
  ServiceFreeTierStatusSchema,
  ServiceStateSchema,
  VaultHealthItemSchema,
  VaultImportResultSchema
} from "./index.js";

describe("core schemas", () => {
  it("accepts only the PRD project types", () => {
    expect(ProjectTypeSchema.parse("ai_saas")).toBe("ai_saas");
    expect(ProjectTypeSchema.parse("rag")).toBe("rag");
    expect(ProjectTypeSchema.safeParse("crm").success).toBe(false);
  });

  it("accepts only documented service capabilities, free-tier statuses, and service states", () => {
    expect(ServiceCapabilitySchema.parse("prompt")).toBe("prompt");
    expect(ServiceCapabilitySchema.safeParse("oauth").success).toBe(false);

    expect(ServiceFreeTierStatusSchema.parse("limited_free")).toBe("limited_free");
    expect(ServiceFreeTierStatusSchema.safeParse("trial_only").success).toBe(false);

    expect(ServiceStateSchema.parse("configured_unverified")).toBe("configured_unverified");
    expect(ServiceStateSchema.safeParse("ready").success).toBe(false);
  });

  it("keeps docs locale stable and does not translate baipiao command identifiers", () => {
    expect(DocsLocaleSchema.parse("zh-CN")).toBe("zh-CN");
    expect(DocsLocaleSchema.parse("en")).toBe("en");
    expect(DocsLocaleSchema.safeParse("zh").success).toBe(false);
  });

  it("rejects unreviewed external catalog candidates that claim config or test capability", () => {
    const candidate = {
      id: "free-for-dev:generative-ai:groq",
      name: "Groq",
      slug: "groq",
      category: "llm",
      sourceCategory: "Generative AI",
      description: "Fast inference API.",
      url: "https://groq.com",
      capability: ["prompt", "config"],
      freeTierText: "Free tier available.",
      freeTierStatus: "free_tier",
      source: {
        id: "free-for-dev",
        url: "https://github.com/ripienaar/free-for-dev",
        rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
        importedAt: "2026-05-12T00:00:00.000Z"
      },
      rawExcerptRef: {
        path: "registry/sources/free-for-dev/raw/sample.md",
        lineStart: 3,
        lineEnd: 3
      },
      confidence: "medium",
      reviewStatus: "needs_review",
      matchedServiceId: null,
      warnings: []
    };

    expect(CatalogNormalizedItemSchema.safeParse(candidate).success).toBe(false);
    expect(
      CatalogNormalizedItemSchema.parse({
        ...candidate,
        capability: ["prompt"]
      }).capability
    ).toEqual(["prompt"]);
  });

  it("validates runtime operation schemas for vault, env, setup, status, and stack", () => {
    expect(VaultImportResultSchema.parse({
      saved: [
        {
          key: "GROQ_API_KEY",
          valueRef: "platform:GROQ_API_KEY",
          secret: true,
          public: false,
          required: true,
          status: "stored",
          scope: "server"
        }
      ],
      failed: [],
      warnings: []
    }).saved[0]?.key).toBe("GROQ_API_KEY");

    expect(VaultHealthItemSchema.parse({
      key: "SUPABASE_SERVICE_ROLE_KEY",
      status: "warning",
      message: "server-only",
      serviceId: "supabase"
    }).status).toBe("warning");

    expect(EnvGenerationEntrySchema.parse({
      key: "GROQ_API_KEY",
      value: "gsk_**************************1234",
      state: "tested"
    }).state).toBe("tested");

    expect(SavedSetupEntrySchema.parse({
      key: "GROQ_API_KEY",
      serviceId: "groq",
      maskedValue: "gsk_**************************1234",
      valid: true,
      secret: true,
      public: false,
      valueRef: "platform:GROQ_API_KEY"
    }).valid).toBe(true);

    expect(FailedSetupEntrySchema.parse({
      key: "GROQ_API_KEY",
      code: "SECRET_VALIDATION_FAILED",
      reason: "bad format"
    }).code).toBe("SECRET_VALIDATION_FAILED");

    expect(ProjectStatusSummarySchema.parse({
      projectName: "Demo",
      services: [
        {
          serviceId: "groq",
          state: "tested",
          envKeys: ["GROQ_API_KEY"],
          configKeys: ["GROQ_API_KEY"]
        }
      ],
      vaultKeyCount: 1,
      envReady: true,
      testState: "tested"
    }).envReady).toBe(true);

    expect(RecommendedStackSchema.parse({
      id: "ai-saas-basic",
      projectType: "ai_saas",
      title: "AI SaaS basic free stack",
      services: [
        { serviceId: "groq", role: "llm", required: true }
      ]
    }).services[0]?.serviceId).toBe("groq");
  });
});
