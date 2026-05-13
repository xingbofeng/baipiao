import {
  NormalizedCatalogFileSchema,
  type CatalogNormalizedItem,
  type NormalizedCatalogFile,
  type ServiceFreeTierStatus
} from "../../schemas/index.js";

const SOURCE_URL = "https://github.com/ripienaar/free-for-dev";
const RAW_URL = "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md";

export type NormalizeFreeForDevOptions = {
  fetchedAt: string;
  rawSnapshotPath: string;
  etag?: string;
  commitSha?: string;
  contentSha256?: string;
  stale?: boolean;
};

const CATEGORY_MAP: Record<string, string> = {
  "generative ai": "llm",
  baas: "database",
  "storage and media processing": "object_storage",
  "web hosting": "hosting",
  email: "email",
  monitoring: "monitoring",
  "messaging and streaming": "queue",
  analytics: "analytics"
};

export function normalizeFreeForDevMarkdown(
  markdown: string,
  options: NormalizeFreeForDevOptions
): NormalizedCatalogFile {
  const lines = markdown.split(/\r?\n/);
  const seenCategories = new Set<string>();
  const items: CatalogNormalizedItem[] = [];
  let currentCategory: string | null = null;
  let skippedItemCount = 0;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      currentCategory = stripMarkdown(heading[1] ?? "").trim();
      seenCategories.add(currentCategory);
      return;
    }

    const parsed = /^\s*[-*]\s+\[([^\]]+)]\(([^)]+)\)\s*(?:[-–—:]\s*)?(.*)$/.exec(line);
    if (!parsed) {
      if (/^\s*[-*]\s+/.test(line)) {
        skippedItemCount += 1;
      }
      return;
    }

    if (!currentCategory) {
      skippedItemCount += 1;
      return;
    }

    const name = stripMarkdown(parsed[1] ?? "").trim();
    const url = (parsed[2] ?? "").trim();
    const description = normalizeWhitespace(stripMarkdown(parsed[3] ?? ""));
    const sourceCategorySlug = slugify(currentCategory);
    const serviceSlug = slugify(name);
    const category = mapCategory(currentCategory);
    const warnings = category === "unknown" ? [`Unknown source category: ${currentCategory}`] : [];

    items.push({
      id: `free-for-dev:${sourceCategorySlug}:${serviceSlug}`,
      name,
      slug: serviceSlug,
      category,
      sourceCategory: currentCategory,
      description,
      url,
      capability: ["prompt"],
      freeTierText: deriveFreeTierText(description),
      freeTierStatus: deriveFreeTierStatus(description),
      source: {
        id: "free-for-dev",
        url: SOURCE_URL,
        rawUrl: RAW_URL,
        importedAt: options.fetchedAt
      },
      rawExcerptRef: {
        path: options.rawSnapshotPath,
        lineStart: lineNumber,
        lineEnd: lineNumber
      },
      confidence: "medium",
      reviewStatus: "needs_review",
      matchedServiceId: null,
      warnings
    });
  });

  const warningCount = items.reduce((count, item) => count + item.warnings.length, 0);
  const normalized = {
    schemaVersion: "baipiao.normalized-catalog.v1",
    generatedAt: options.fetchedAt,
    source: {
      id: "free-for-dev",
      name: "free-for-dev",
      url: SOURCE_URL,
      rawUrl: RAW_URL,
      license: "unknown",
      fetchedAt: options.fetchedAt,
      ...(options.etag ? { etag: options.etag } : {}),
      ...(options.commitSha ? { commitSha: options.commitSha } : {}),
      ...(options.contentSha256 ? { contentSha256: options.contentSha256 } : {}),
      stale: options.stale ?? false
    },
    parser: {
      name: "free-for-dev-markdown",
      version: "1"
    },
    stats: {
      categoryCount: seenCategories.size,
      parsedItemCount: items.length,
      skippedItemCount,
      warningCount
    },
    items
  };

  return NormalizedCatalogFileSchema.parse(normalized);
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapCategory(sourceCategory: string): string {
  return CATEGORY_MAP[sourceCategory.toLowerCase()] ?? "unknown";
}

function deriveFreeTierText(description: string): string {
  return description || "Free tier details require review.";
}

function deriveFreeTierStatus(description: string): ServiceFreeTierStatus {
  const lower = description.toLowerCase();
  if (/\bpaid\b/.test(lower) && !/\bfree\b/.test(lower)) {
    return "paid";
  }
  if (/limited free|free limits?|limited tier/.test(lower)) {
    return "limited_free";
  }
  if (/free tier|free plan|free models?|included|per month|per day|\bfree\b/.test(lower)) {
    return "free_tier";
  }
  return "unknown";
}

function stripMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
