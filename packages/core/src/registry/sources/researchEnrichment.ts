import {
  CatalogEnrichmentSchema,
  type CatalogNormalizedItem
} from "../../schemas/index.js";
import { maskKnownSecretsInText } from "../../vault/index.js";
import type { CatalogEnrichment, CatalogEnrichmentProvider } from "./enrichment.js";

export type ResearchSearchTarget = "homepage" | "docs" | "console" | "api_keys" | "pricing";
export type ResearchConfidence = "high" | "medium" | "low";
export type ResearchSourceType = ResearchSearchTarget | "status" | "terms" | "other";

export type ResearchSearchRequest = {
  item: CatalogNormalizedItem;
  target: ResearchSearchTarget;
  query: string;
};

export type ResearchSearchResult = {
  url: string;
  title?: string;
  snippet?: string;
  target?: ResearchSearchTarget;
  confidence?: ResearchConfidence;
};

export type ResearchExtractRequest = {
  item: CatalogNormalizedItem;
  result: ResearchSearchResult & { target: ResearchSearchTarget };
};

export type ResearchExtractedContent = {
  url: string;
  title?: string;
  text?: string;
  extractedAt?: string;
  urls?: Record<string, string | null>;
  serviceType?: string;
  tags?: string[];
  authRequirements?: string[];
  setupHints?: string[];
  envKeyHints?: CatalogEnrichment["envKeyHints"];
  freeTier?: CatalogEnrichment["freeTier"];
  warnings?: string[];
  confidence?: ResearchConfidence;
};

export type ResearchEnrichmentCacheEntry = {
  cachedAt: string;
  enrichment: CatalogEnrichment;
};

export type ResearchEnrichmentCache = {
  get(key: string): Promise<ResearchEnrichmentCacheEntry | undefined>;
  set(key: string, entry: ResearchEnrichmentCacheEntry): Promise<void>;
};

export type ResearchEnrichmentProviderOptions = {
  search: (request: ResearchSearchRequest) => Promise<ResearchSearchResult[]>;
  extract: (request: ResearchExtractRequest) => Promise<ResearchExtractedContent>;
  cache?: ResearchEnrichmentCache;
  now?: () => string;
  cacheTtlMs?: number;
  timeoutMs?: number;
  maxResultsPerTarget?: number;
  targets?: ResearchSearchTarget[];
};

const DEFAULT_TARGETS: ResearchSearchTarget[] = ["homepage", "docs", "console", "api_keys", "pricing"];
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_RESULTS_PER_TARGET = 3;

const URL_KEY_BY_TARGET: Record<ResearchSearchTarget, string> = {
  homepage: "homepage",
  docs: "docs",
  console: "console",
  api_keys: "apiKeys",
  pricing: "pricing"
};

export function createResearchEnrichmentProvider(
  options: ResearchEnrichmentProviderOptions
): CatalogEnrichmentProvider {
  return {
    enrichItem: async (item) => {
      const now = options.now?.() ?? new Date().toISOString();
      const cacheKey = getResearchCacheKey(item);
      const cached = await options.cache?.get(cacheKey);

      if (cached && !isCacheStale(cached, now, options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS)) {
        return CatalogEnrichmentSchema.parse(cached.enrichment);
      }

      const researched = await researchItem(item, now, options);
      if (researched.status === "failed" && cached) {
        return CatalogEnrichmentSchema.parse({
          ...cached.enrichment,
          status: "stale",
          warnings: [
            ...new Set([
              ...(cached.enrichment.warnings ?? []),
              `Research enrichment failed; using stale cache: ${researched.warnings?.[0] ?? "unknown error"}`
            ])
          ]
        });
      }

      if (researched.status !== "failed") {
        await options.cache?.set(cacheKey, {
          cachedAt: now,
          enrichment: researched
        });
      }

      return CatalogEnrichmentSchema.parse(researched);
    }
  };
}

export function getResearchCacheKey(item: Pick<CatalogNormalizedItem, "id" | "source">): string {
  return `research:${item.source.id}:${item.id}:v1`;
}

async function researchItem(
  item: CatalogNormalizedItem,
  now: string,
  options: ResearchEnrichmentProviderOptions
): Promise<CatalogEnrichment> {
  const targets = options.targets ?? DEFAULT_TARGETS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResultsPerTarget = options.maxResultsPerTarget ?? DEFAULT_MAX_RESULTS_PER_TARGET;
  const warnings: string[] = [];
  const searchResults: Array<ResearchSearchResult & { target: ResearchSearchTarget }> = [];

  for (const target of targets) {
    try {
      const results = await withTimeout(
        options.search({ item, target, query: buildSearchQuery(item, target) }),
        timeoutMs,
        `search ${target}`
      );
      searchResults.push(
        ...results.slice(0, maxResultsPerTarget).map((result) => ({
          ...result,
          target: result.target ?? target
        }))
      );
    } catch (error) {
      warnings.push(formatResearchError(error));
    }
  }

  const uniqueResults = dedupeSearchResults(searchResults);
  if (uniqueResults.length === 0) {
    return failedEnrichment(now, [...warnings, "No research search results were returned."]);
  }

  const extracted: ResearchExtractedContent[] = [];
  for (const result of uniqueResults) {
    try {
      extracted.push(await withTimeout(
        options.extract({ item, result }),
        timeoutMs,
        `extract ${result.url}`
      ));
    } catch (error) {
      warnings.push(formatResearchError(error));
    }
  }

  if (extracted.length === 0) {
    return failedEnrichment(now, [...warnings, "Research extraction failed for all sources."]);
  }

  return synthesizeEnrichment(item, now, uniqueResults, extracted, warnings);
}

function synthesizeEnrichment(
  item: CatalogNormalizedItem,
  now: string,
  results: Array<ResearchSearchResult & { target: ResearchSearchTarget }>,
  extracted: ResearchExtractedContent[],
  existingWarnings: string[]
): CatalogEnrichment {
  const warnings = new Set(existingWarnings);
  const selectedResults = selectPrimaryResultPerTarget(results);
  const urls: Record<string, string> = {};
  const sources = selectedResults.map((result) => {
    setUrlCandidate(urls, warnings, URL_KEY_BY_TARGET[result.target], result.url);
    return {
      url: result.url,
      ...(result.title ? { title: result.title } : {}),
      type: result.target,
      confidence: result.confidence ?? "low"
    };
  });

  const setupHints = new Set<string>();
  const tags = new Set(item.enrichment?.tags ?? item.enrichment?.tags ?? []);
  const authRequirements = new Set<string>();
  const envKeyHints: NonNullable<CatalogEnrichment["envKeyHints"]> = [];
  let serviceType: string | undefined;
  let freeTier: CatalogEnrichment["freeTier"] | undefined;

  for (const content of extracted) {
    if (content.urls) {
      for (const [key, value] of Object.entries(content.urls)) {
        if (value) {
          setUrlCandidate(urls, warnings, key, value);
        }
      }
    }
    for (const hint of content.setupHints ?? []) {
      setupHints.add(sanitizeResearchText(hint));
    }
    for (const tag of content.tags ?? []) {
      tags.add(sanitizeResearchText(tag));
    }
    for (const requirement of content.authRequirements ?? []) {
      authRequirements.add(sanitizeResearchText(requirement));
    }
    for (const hint of content.envKeyHints ?? []) {
      if (!envKeyHints.some((existing) => existing.key === hint.key)) {
        envKeyHints.push({
          ...hint,
          kind: sanitizeResearchText(hint.kind)
        });
      }
    }
    for (const warning of content.warnings ?? []) {
      warnings.add(sanitizeResearchText(warning));
    }
    serviceType ??= content.serviceType ? sanitizeResearchText(content.serviceType) : undefined;
    freeTier ??= content.freeTier;
  }

  const warningList = [...warnings];

  return CatalogEnrichmentSchema.parse({
    status: warningList.length > 0 ? "partial" : "completed",
    method: "agent",
    generatedAt: now,
    sources,
    urls,
    ...(serviceType ? { serviceType } : {}),
    ...(tags.size > 0 ? { tags: [...tags] } : {}),
    ...(authRequirements.size > 0 ? { authRequirements: [...authRequirements] } : {}),
    ...(setupHints.size > 0 ? { setupHints: [...setupHints] } : {}),
    ...(envKeyHints.length > 0 ? { envKeyHints } : {}),
    ...(freeTier ? { freeTier: sanitizeFreeTier(freeTier) } : {}),
    confidence: inferConfidence(sources.map((source) => source.confidence)),
    reviewStatus: "needs_review",
    warnings: warningList
  });
}

function failedEnrichment(now: string, warnings: string[]): CatalogEnrichment {
  return CatalogEnrichmentSchema.parse({
    status: "failed",
    method: "agent",
    generatedAt: now,
    confidence: "low",
    reviewStatus: "needs_review",
    warnings: [...new Set(warnings.map((warning) => sanitizeResearchText(warning)))]
  });
}

function setUrlCandidate(
  urls: Record<string, string>,
  warnings: Set<string>,
  key: string,
  value: string
): void {
  const current = urls[key];
  if (current && current !== value) {
    warnings.add(`Conflicting ${humanizeUrlKey(key)} URL candidates; kept ${current}.`);
    return;
  }

  urls[key] = value;
}

function humanizeUrlKey(key: string): string {
  if (key === "apiKeys") {
    return "API keys";
  }

  return key.replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`).toLowerCase();
}

function buildSearchQuery(item: CatalogNormalizedItem, target: ResearchSearchTarget): string {
  const suffixByTarget: Record<ResearchSearchTarget, string> = {
    homepage: "official homepage",
    docs: "developer docs",
    console: "developer console",
    api_keys: "API keys",
    pricing: "free tier pricing"
  };

  return `${item.name} ${suffixByTarget[target]}`;
}

function dedupeSearchResults(
  results: Array<ResearchSearchResult & { target: ResearchSearchTarget }>
): Array<ResearchSearchResult & { target: ResearchSearchTarget }> {
  const seen = new Set<string>();
  const unique: Array<ResearchSearchResult & { target: ResearchSearchTarget }> = [];

  for (const result of results) {
    const key = normalizeUrl(result.url);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(result);
  }

  return unique;
}

function selectPrimaryResultPerTarget(
  results: Array<ResearchSearchResult & { target: ResearchSearchTarget }>
): Array<ResearchSearchResult & { target: ResearchSearchTarget }> {
  const selected = new Map<ResearchSearchTarget, ResearchSearchResult & { target: ResearchSearchTarget }>();

  for (const result of results) {
    if (!selected.has(result.target)) {
      selected.set(result.target, result);
    }
  }

  return DEFAULT_TARGETS.flatMap((target) => {
    const result = selected.get(target);
    return result ? [result] : [];
  });
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function isCacheStale(entry: ResearchEnrichmentCacheEntry, now: string, ttlMs: number): boolean {
  return new Date(now).getTime() - new Date(entry.cachedAt).getTime() > ttlMs;
}

function formatResearchError(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeResearchText(error.message);
  }

  return sanitizeResearchText(String(error));
}

function sanitizeFreeTier(freeTier: NonNullable<CatalogEnrichment["freeTier"]>): CatalogEnrichment["freeTier"] {
  return {
    ...freeTier,
    ...(freeTier.summary ? { summary: sanitizeResearchText(freeTier.summary) } : {}),
    ...(freeTier.resetCycle ? { resetCycle: sanitizeResearchText(freeTier.resetCycle) } : {}),
    ...(freeTier.limits ? { limits: freeTier.limits.map((limit) => sanitizeResearchText(limit)) } : {})
  };
}

function sanitizeResearchText(text: string): string {
  return maskKnownSecretsInText(text)
    .replace(
      /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Z0-9_]*)=([^\s,;.]+)([.,;]?)/g,
      "$1=********$3"
    );
}

function inferConfidence(confidences: ResearchConfidence[]): ResearchConfidence {
  if (confidences.includes("high")) {
    return "high";
  }
  if (confidences.includes("medium")) {
    return "medium";
  }
  return "low";
}
