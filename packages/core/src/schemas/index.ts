import { z } from "zod";

export const ProjectTypeSchema = z.enum([
  "ai_saas",
  "rag",
  "blog",
  "agent_tool",
  "mobile_app",
  "custom"
]);

export const ServiceCapabilitySchema = z.enum(["prompt", "config", "test"]);

export const ServiceFreeTierStatusSchema = z.enum([
  "free_tier",
  "limited_free",
  "paid",
  "unknown"
]);

export const ServiceStateSchema = z.enum([
  "not_started",
  "prompt_generated",
  "agent_output_received",
  "configured_unverified",
  "configured",
  "tested",
  "failed"
]);

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const ReviewStatusSchema = z.enum(["needs_review", "accepted", "rejected", "reviewed"]);
export const DocsLocaleSchema = z.enum(["zh-CN", "en"]);
export const TranslationStatusSchema = z.enum(["translated", "translation_pending", "fallback"]);

export const EnvVarSpecSchema = z.object({
  key: z.string().min(1),
  secret: z.boolean(),
  required: z.boolean(),
  pattern: z.string().optional(),
  description: z.string().optional(),
  public: z.boolean().optional()
});

export const FreeTierInfoSchema = z.object({
  status: ServiceFreeTierStatusSchema.optional(),
  summary: z.string().optional(),
  requiresCreditCard: z.boolean().nullable().optional(),
  resetCycle: z.string().optional(),
  confidence: ConfidenceSchema.optional()
});

export const ProviderTestSpecSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("openai_compatible_chat"),
    baseUrl: z.string().url(),
    envKey: z.string(),
    modelHint: z.string().optional(),
    baseUrlEnv: z.string().optional(),
    apiKeyEnv: z.string().optional(),
    model: z.string().optional()
  }),
  z.object({
    type: z.literal("http"),
    url: z.string(),
    method: z.enum(["GET", "POST", "HEAD"]).default("GET"),
    expectedStatus: z.number().int().min(100).max(599).optional()
  }),
  z.object({
    type: z.literal("supabase"),
    urlEnvKey: z.string(),
    anonKeyEnvKey: z.string(),
    urlEnv: z.string().optional(),
    anonKeyEnv: z.string().optional()
  }),
  z.object({
    type: z.literal("s3_compatible"),
    endpointEnvKey: z.string(),
    accessKeyEnvKey: z.string(),
    secretKeyEnvKey: z.string(),
    bucketEnvKey: z.string().optional(),
    endpointEnv: z.string().optional(),
    accessKeyIdEnv: z.string().optional(),
    secretAccessKeyEnv: z.string().optional(),
    bucketEnv: z.string().optional()
  }),
  z.object({
    type: z.literal("manual"),
    reason: z.string().optional()
  })
]);

export const ServiceConfigSpecSchema = z.object({
  urls: z.record(z.string(), z.string().nullable()).optional(),
  freeTier: FreeTierInfoSchema.optional(),
  env: z.array(EnvVarSpecSchema).optional(),
  prompt: z.unknown().optional(),
  test: ProviderTestSpecSchema.optional(),
  risks: z.array(z.string()).optional()
});

export const SourceRefSchema = z.object({
  name: z.string().optional(),
  id: z.string().optional(),
  url: z.string().url(),
  rawUrl: z.string().url().optional(),
  importedAt: z.string().datetime().optional()
});

export const ServiceRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  category: z.string().min(1),
  capability: z.array(ServiceCapabilitySchema).min(1),
  description: z.string().optional(),
  url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  source: SourceRefSchema.optional(),
  config: ServiceConfigSpecSchema.optional()
});

export const ProjectConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  type: ProjectTypeSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  envPath: z.string().min(1)
});

export const ProjectServiceRecordSchema = z.object({
  serviceId: z.string().min(1),
  state: ServiceStateSchema,
  envKeys: z.array(z.string()),
  configKeys: z.array(z.string()),
  lastPromptGeneratedAt: z.string().datetime().optional(),
  lastAgentOutputAt: z.string().datetime().optional(),
  lastSecretSavedAt: z.string().datetime().optional(),
  lastTestAt: z.string().datetime().optional(),
  lastError: z.string().optional()
});

export const VaultEntrySchema = z.object({
  key: z.string().min(1),
  valueRef: z.string().min(1),
  secret: z.boolean(),
  public: z.boolean(),
  required: z.boolean(),
  status: z.enum(["stored", "missing", "invalid", "untested"]),
  scope: z.enum(["public", "server", "unknown"]),
  serviceId: z.string().optional(),
  lastUpdatedAt: z.string().datetime().optional(),
  lastTestAt: z.string().datetime().optional()
});

export const VaultImportResultSchema = z.object({
  saved: z.array(VaultEntrySchema),
  failed: z.array(z.object({
    key: z.string().min(1),
    reason: z.string().min(1)
  })),
  warnings: z.array(z.string())
});

export const VaultHealthItemSchema = z.object({
  key: z.string().min(1),
  status: z.enum(["ok", "missing", "invalid", "warning"]),
  message: z.string(),
  serviceId: z.string().optional()
});

export const EnvGenerationStateSchema = z.enum(["tested", "configured", "configured_unverified"]);

export const EnvGenerationEntrySchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  state: EnvGenerationStateSchema
});

export const SavedSetupEntrySchema = z.object({
  key: z.string().min(1),
  serviceId: z.string().min(1),
  maskedValue: z.string(),
  valid: z.literal(true),
  secret: z.boolean(),
  public: z.boolean(),
  valueRef: z.string().min(1)
});

export const FailedSetupEntrySchema = z.object({
  key: z.string().min(1),
  code: z.enum(["SECRET_VALIDATION_FAILED", "AGENT_OUTPUT_PARSE_FAILED"]),
  reason: z.string().min(1)
});

export const ProjectStatusSummarySchema = z.object({
  projectName: z.string().min(1),
  services: z.array(ProjectServiceRecordSchema),
  vaultKeyCount: z.number().int().nonnegative(),
  envReady: z.boolean(),
  testState: z.enum(["tested", "not_tested", "failed"])
});

export const RecommendedStackServiceSchema = z.object({
  serviceId: z.string().min(1),
  role: z.enum(["llm", "database", "storage", "hosting", "deployment"]),
  required: z.boolean()
});

export const RecommendedStackSchema = z.object({
  id: z.string().min(1),
  projectType: ProjectTypeSchema,
  title: z.string().min(1),
  services: z.array(RecommendedStackServiceSchema).min(1)
});

export const RawExcerptRefSchema = z.object({
  path: z.string().min(1),
  lineStart: z.number().int().positive(),
  lineEnd: z.number().int().positive(),
  sha256: z.string().optional()
});

export const CatalogSourceSchema = z.object({
  id: z.literal("free-for-dev"),
  url: z.string().url(),
  rawUrl: z.string().url(),
  importedAt: z.string().datetime()
});

export const EnrichmentSourceSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  type: z.enum(["homepage", "docs", "console", "api_keys", "pricing", "status", "terms", "other"]),
  confidence: ConfidenceSchema
});

export const CatalogEnrichmentSchema = z.object({
  status: z.enum(["pending", "completed", "partial", "failed", "stale"]).optional(),
  method: z.enum(["agent", "manual", "hybrid"]).optional(),
  generatedAt: z.string().datetime().optional(),
  model: z.string().optional(),
  sources: z.array(EnrichmentSourceSchema).optional(),
  urls: z.record(z.string(), z.string().url().nullable()).optional(),
  serviceType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  authRequirements: z.array(z.string()).optional(),
  setupHints: z.array(z.string()).optional(),
  envKeyHints: z.array(z.object({
    key: z.string(),
    kind: z.string(),
    required: z.boolean(),
    confidence: ConfidenceSchema
  })).optional(),
  freeTier: FreeTierInfoSchema.extend({
    limits: z.array(z.string()).optional()
  }).optional(),
  localization: z.record(z.string(), z.unknown()).optional(),
  confidence: ConfidenceSchema.optional(),
  reviewStatus: ReviewStatusSchema.optional(),
  warnings: z.array(z.string()).optional()
});

export const CatalogNormalizedItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  category: z.string().min(1),
  sourceCategory: z.string().min(1),
  description: z.string(),
  url: z.string().url(),
  capability: z.array(ServiceCapabilitySchema).min(1),
  freeTierText: z.string(),
  freeTierStatus: ServiceFreeTierStatusSchema,
  source: CatalogSourceSchema,
  rawExcerptRef: RawExcerptRefSchema,
  confidence: ConfidenceSchema,
  reviewStatus: ReviewStatusSchema,
  matchedServiceId: z.string().nullable().optional(),
  warnings: z.array(z.string()),
  enrichment: CatalogEnrichmentSchema.optional()
}).superRefine((item, ctx) => {
  if (item.reviewStatus === "needs_review") {
    const onlyPrompt = item.capability.length === 1 && item.capability[0] === "prompt";
    if (!onlyPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unreviewed external catalog candidates can only declare prompt capability",
        path: ["capability"]
      });
    }
  }
});

export const NormalizedCatalogFileSchema = z.object({
  schemaVersion: z.literal("baipiao.normalized-catalog.v1"),
  generatedAt: z.string().datetime(),
  source: z.object({
    id: z.literal("free-for-dev"),
    name: z.literal("free-for-dev"),
    url: z.string().url(),
    rawUrl: z.string().url(),
    license: z.string(),
    fetchedAt: z.string().datetime(),
    etag: z.string().optional(),
    commitSha: z.string().optional(),
    contentSha256: z.string().optional(),
    stale: z.boolean()
  }),
  parser: z.object({
    name: z.literal("free-for-dev-markdown"),
    version: z.string()
  }),
  stats: z.object({
    categoryCount: z.number().int().nonnegative(),
    parsedItemCount: z.number().int().nonnegative(),
    skippedItemCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative()
  }),
  items: z.array(CatalogNormalizedItemSchema)
});

export type ProjectType = z.infer<typeof ProjectTypeSchema>;
export type ServiceCapability = z.infer<typeof ServiceCapabilitySchema>;
export type ServiceFreeTierStatus = z.infer<typeof ServiceFreeTierStatusSchema>;
export type ServiceState = z.infer<typeof ServiceStateSchema>;
export type ServiceRecord = z.infer<typeof ServiceRecordSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type ProjectServiceRecord = z.infer<typeof ProjectServiceRecordSchema>;
export type ProjectStatusSummary = z.infer<typeof ProjectStatusSummarySchema>;
export type CatalogNormalizedItem = z.infer<typeof CatalogNormalizedItemSchema>;
export type NormalizedCatalogFile = z.infer<typeof NormalizedCatalogFileSchema>;
