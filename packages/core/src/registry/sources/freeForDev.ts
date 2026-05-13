import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CatalogNormalizedItemSchema,
  NormalizedCatalogFileSchema,
  type CatalogNormalizedItem,
  type NormalizedCatalogFile
} from "../../schemas/index.js";
import { normalizeFreeForDevMarkdown } from "./normalizer.js";

export const freeForDevSourceId = "free-for-dev";
export const freeForDevSourceUrl = "https://github.com/ripienaar/free-for-dev";
export const freeForDevRawUrl = "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md";

export type FetchTextOptions = {
  ifNoneMatch?: string;
};

export type FetchTextResult = {
  text: string;
  etag?: string;
  commitSha?: string;
  notModified?: false;
} | {
  notModified: true;
  etag?: string;
  commitSha?: string;
};

export type RefreshFreeForDevOptions = {
  cwd: string;
  now?: string;
  fetchText?: (url: string, options?: FetchTextOptions) => Promise<FetchTextResult>;
};

export type RefreshFreeForDevResult = {
  imported: number;
  updated: number;
  skipped: number;
  needsReview: number;
  errors: number;
  stale: boolean;
  rawSnapshotPath: string;
  importSnapshotPath: string;
};

export const freeForDevCatalogLocales = ["en", "zh-CN", "ja", "ko", "fr", "es"] as const;

export type FreeForDevCatalogLocale = (typeof freeForDevCatalogLocales)[number];

export type FreeForDevCatalogQuery = {
  query?: string;
  category?: string;
  sourceCategory?: string;
  locale?: FreeForDevCatalogLocale;
  systemLocale?: string;
  limit?: number;
  offset?: number;
};

export type FreeForDevCatalogItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  sourceCategory: string;
  description: string;
  url: string;
  capability: CatalogNormalizedItem["capability"];
  freeTierText: string;
  freeTierStatus: CatalogNormalizedItem["freeTierStatus"];
  confidence: CatalogNormalizedItem["confidence"];
  reviewStatus: CatalogNormalizedItem["reviewStatus"];
  matchedServiceId?: string | null;
  warnings: string[];
  locale: FreeForDevCatalogLocale;
  requestedLocale: FreeForDevCatalogLocale;
  translationStatus: "original" | "translated" | "machine_translated" | "fallback";
};

export type FreeForDevCatalogSearchResult = {
  items: FreeForDevCatalogItem[];
  total: number;
  limit: number;
  offset: number;
  requestedLocale: FreeForDevCatalogLocale;
  source: NormalizedCatalogFile["source"];
  stats: NormalizedCatalogFile["stats"];
};

export type FreeForDevCatalogCategories = {
  categories: Array<{ id: string; name: string; count: number }>;
  sourceCategories: Array<{ id: string; name: string; count: number }>;
  total: number;
  source: NormalizedCatalogFile["source"];
};

export type FreeForDevCatalogTranslation = {
  id: string;
  name?: string;
  description?: string;
  freeTierText?: string;
};

export type ApplyFreeForDevCatalogTranslationsOptions = {
  locale: Exclude<FreeForDevCatalogLocale, "en">;
  translations: FreeForDevCatalogTranslation[];
  translatedAt?: string;
};

export type FreeForDevCatalogTranslationBatchOptions = {
  locale: Exclude<FreeForDevCatalogLocale, "en">;
  query?: string | undefined;
  category?: string | undefined;
  sourceCategory?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  untranslatedOnly?: boolean | undefined;
};

export type FreeForDevCatalogTranslationBatchItem = {
  id: string;
  category: string;
  sourceCategory: string;
  url: string;
  source: {
    name: string;
    description: string;
    freeTierText: string;
  };
  existingTranslation?: FreeForDevCatalogTranslation & {
    status?: string;
    reviewStatus?: string;
    translatedAt?: string;
  };
};

export type FreeForDevCatalogTranslationBatch = {
  locale: Exclude<FreeForDevCatalogLocale, "en">;
  items: FreeForDevCatalogTranslationBatchItem[];
  total: number;
  limit: number;
  offset: number;
  untranslatedOnly: boolean;
  source: NormalizedCatalogFile["source"];
  stats: NormalizedCatalogFile["stats"];
};

export async function refreshFreeForDevSource(
  options: RefreshFreeForDevOptions
): Promise<RefreshFreeForDevResult> {
  const now = options.now ?? new Date().toISOString();
  const sourceRoot = join(options.cwd, "registry", "sources", "free-for-dev");
  const rawDir = join(sourceRoot, "raw");
  const snapshotsDir = join(sourceRoot, "snapshots");
  await mkdir(rawDir, { recursive: true });
  await mkdir(snapshotsDir, { recursive: true });

  const cachedSource = await readJsonIfExists<CachedSourceMetadata>(join(sourceRoot, "source.json"));
  let fetched: FetchTextResult;
  try {
    fetched = await (options.fetchText ?? defaultFetchText)(
      freeForDevRawUrl,
      cachedSource?.etag ? { ifNoneMatch: cachedSource.etag } : undefined
    );
  } catch {
    return markFreeForDevSourceStale(options.cwd, now);
  }
  if (fetched.notModified) {
    return markFreeForDevSourceNotModified(options.cwd, now, fetched);
  }

  const stamp = toSnapshotStamp(now);
  const rawSnapshotPath = `registry/sources/free-for-dev/raw/${stamp}.md`;
  const importSnapshotPath = `registry/sources/free-for-dev/snapshots/${stamp}.json`;
  const contentSha256 = sha256(fetched.text);

  await writeFile(join(options.cwd, rawSnapshotPath), fetched.text, "utf8");

  const normalized = normalizeFreeForDevMarkdown(fetched.text, {
    fetchedAt: now,
    rawSnapshotPath,
    ...(fetched.etag ? { etag: fetched.etag } : {}),
    ...(fetched.commitSha ? { commitSha: fetched.commitSha } : {}),
    contentSha256,
    stale: false
  });
  const existingCatalog = await loadExistingFreeForDevCatalog(options.cwd, join(sourceRoot, "normalized.json"));
  const mergedNormalized = mergeExistingCatalogLocalization(normalized, existingCatalog);

  const sourceMetadata = {
    name: "free-for-dev",
    url: freeForDevSourceUrl,
    rawUrl: freeForDevRawUrl,
    license: "unknown",
    importedAt: now,
    parserVersion: "1",
    ...(fetched.etag ? { etag: fetched.etag } : {}),
    ...(fetched.commitSha ? { commitSha: fetched.commitSha } : {}),
    contentSha256,
    rawSnapshotPath,
    importSnapshotPath,
    lastStatus: "ok",
    stale: false,
    candidateCount: mergedNormalized.items.length
  };

  await Promise.all([
    writeJson(join(sourceRoot, "source.json"), sourceMetadata),
    writeJson(join(sourceRoot, "normalized.json"), mergedNormalized),
    writeJson(join(options.cwd, importSnapshotPath), mergedNormalized)
  ]);

  return {
    imported: mergedNormalized.items.length,
    updated: mergedNormalized.items.length,
    skipped: mergedNormalized.stats.skippedItemCount,
    needsReview: mergedNormalized.items.filter((item) => item.reviewStatus === "needs_review").length,
    errors: 0,
    stale: false,
    rawSnapshotPath,
    importSnapshotPath
  };
}

async function loadExistingFreeForDevCatalog(
  cwd: string,
  localCatalogPath: string
): Promise<NormalizedCatalogFile | undefined> {
  const localCatalog = await readJsonIfExists<NormalizedCatalogFile>(localCatalogPath);
  if (localCatalog) {
    return NormalizedCatalogFileSchema.parse(localCatalog);
  }
  try {
    return await loadFreeForDevCatalog(cwd);
  } catch {
    return undefined;
  }
}

function mergeExistingCatalogLocalization(
  nextCatalog: NormalizedCatalogFile,
  existingCatalog: NormalizedCatalogFile | undefined
): NormalizedCatalogFile {
  if (!existingCatalog) {
    return nextCatalog;
  }

  const existingById = new Map(existingCatalog.items.map((item) => [item.id, item]));
  const items = nextCatalog.items.map((item) => {
    const existingLocalization = existingById.get(item.id)?.enrichment?.localization;
    if (!existingLocalization || Object.keys(existingLocalization).length === 0) {
      return item;
    }

    return {
      ...item,
      enrichment: {
        ...(item.enrichment ?? {}),
        localization: existingLocalization
      }
    };
  });

  return NormalizedCatalogFileSchema.parse({
    ...nextCatalog,
    items
  });
}

async function markFreeForDevSourceNotModified(
  cwd: string,
  now: string,
  fetched: Extract<FetchTextResult, { notModified: true }>
): Promise<RefreshFreeForDevResult> {
  const sourceRoot = join(cwd, "registry", "sources", "free-for-dev");
  const sourceMetadata = await readJsonIfExists<CachedSourceMetadata>(join(sourceRoot, "source.json"));
  const normalized = await readJsonIfExists<CachedNormalizedCatalog>(join(sourceRoot, "normalized.json"));
  const cachedRawSnapshotPath = sourceMetadata?.rawSnapshotPath
    ?? normalized?.items?.find((item) => item.rawExcerptRef?.path)?.rawExcerptRef?.path
    ?? "";
  const cachedImportSnapshotPath = sourceMetadata?.importSnapshotPath ?? "";

  if (sourceMetadata || normalized) {
    await writeJson(join(sourceRoot, "source.json"), {
      name: "free-for-dev",
      url: freeForDevSourceUrl,
      rawUrl: freeForDevRawUrl,
      license: sourceMetadata?.license ?? "unknown",
      ...(sourceMetadata?.importedAt ? { importedAt: sourceMetadata.importedAt } : {}),
      ...(sourceMetadata?.parserVersion ? { parserVersion: sourceMetadata.parserVersion } : { parserVersion: "1" }),
      ...(fetched.etag ?? sourceMetadata?.etag ? { etag: fetched.etag ?? sourceMetadata?.etag } : {}),
      ...(fetched.commitSha ?? sourceMetadata?.commitSha ? { commitSha: fetched.commitSha ?? sourceMetadata?.commitSha } : {}),
      ...(sourceMetadata?.contentSha256 ? { contentSha256: sourceMetadata.contentSha256 } : {}),
      ...(cachedRawSnapshotPath ? { rawSnapshotPath: cachedRawSnapshotPath } : {}),
      ...(cachedImportSnapshotPath ? { importSnapshotPath: cachedImportSnapshotPath } : {}),
      lastAttemptAt: now,
      lastStatus: "not_modified",
      stale: false,
      candidateCount: sourceMetadata?.candidateCount ?? normalized?.items?.length ?? 0
    });
  }

  return {
    imported: 0,
    updated: 0,
    skipped: normalized?.stats?.skippedItemCount ?? 0,
    needsReview: normalized?.items?.filter((item) => item.reviewStatus === "needs_review").length ?? 0,
    errors: 0,
    stale: false,
    rawSnapshotPath: cachedRawSnapshotPath,
    importSnapshotPath: cachedImportSnapshotPath
  };
}

export async function findFreeForDevNormalizedCandidate(
  cwd: string,
  id: string
): Promise<CatalogNormalizedItem | undefined> {
  const normalizedId = normalizeCatalogCandidateLookup(id);
  for (const catalogPath of resolveFreeForDevNormalizedCatalogPaths(cwd)) {
    const parsed = await readJsonIfExists<{ items?: unknown[] }>(catalogPath);
    const item = parsed?.items?.find((candidate) => {
      if (typeof candidate !== "object" || candidate === null) {
        return false;
      }
      const record = candidate as { id?: unknown; slug?: unknown; name?: unknown };
      return [record.id, record.slug, record.name]
        .filter((value): value is string => typeof value === "string")
        .some((value) => {
          const normalizedCandidate = normalizeCatalogCandidateLookup(value);
          return normalizedCandidate === normalizedId || stripCommonDomainSuffix(normalizedCandidate) === normalizedId;
        });
    });
    if (item) {
      return CatalogNormalizedItemSchema.parse(item);
    }
  }
  return undefined;
}

function normalizeCatalogCandidateLookup(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function stripCommonDomainSuffix(value: string): string {
  return value.replace(/(?:com|co|io|ai|net|org|dev|app)$/u, "");
}

export async function loadFreeForDevCatalog(cwd: string): Promise<NormalizedCatalogFile> {
  for (const catalogPath of resolveFreeForDevNormalizedCatalogPaths(cwd)) {
    const parsed = await readJsonIfExists<unknown>(catalogPath);
    if (parsed) {
      return NormalizedCatalogFileSchema.parse(parsed);
    }
  }
  throw new Error("free-for-dev normalized catalog not found");
}

export async function searchFreeForDevCatalog(
  cwd: string,
  query: FreeForDevCatalogQuery = {}
): Promise<FreeForDevCatalogSearchResult> {
  const catalog = await loadFreeForDevCatalog(cwd);
  const requestedLocale = resolveFreeForDevCatalogLocale({
    ...(query.locale === undefined ? {} : { explicitLocale: query.locale }),
    ...(query.query === undefined ? {} : { query: query.query }),
    ...(query.systemLocale === undefined ? {} : { systemLocale: query.systemLocale })
  });
  const normalizedQuery = query.query?.trim().toLowerCase();
  const category = query.category?.trim().toLowerCase();
  const sourceCategory = query.sourceCategory?.trim().toLowerCase();
  const offset = Math.max(0, query.offset ?? 0);

  const ranked = catalog.items.map((item, index) => {
    if (category && item.category.toLowerCase() !== category) {
      return undefined;
    }
    if (sourceCategory && item.sourceCategory.toLowerCase() !== sourceCategory) {
      return undefined;
    }
    if (!normalizedQuery) {
      return { item, index, score: 0 };
    }

    const score = scoreFreeForDevCatalogItem(item, normalizedQuery, requestedLocale);
    return score === undefined ? undefined : { item, index, score };
  }).filter((entry): entry is { item: CatalogNormalizedItem; index: number; score: number } => entry !== undefined)
    .sort((left, right) => left.score - right.score || left.index - right.index);

  const limit = clampLimit(query.limit, ranked.length);

  return {
    items: ranked.slice(offset, offset + limit).map((entry) => toFreeForDevCatalogItem(entry.item, requestedLocale)),
    total: ranked.length,
    limit,
    offset,
    requestedLocale,
    source: catalog.source,
    stats: catalog.stats
  };
}

export async function getFreeForDevCatalogCategories(cwd: string): Promise<FreeForDevCatalogCategories> {
  const catalog = await loadFreeForDevCatalog(cwd);
  return {
    categories: countBy(catalog.items, (item) => item.category),
    sourceCategories: countBy(catalog.items, (item) => item.sourceCategory),
    total: catalog.items.length,
    source: catalog.source
  };
}

export async function getFreeForDevCatalogTranslationBatch(
  cwd: string,
  options: FreeForDevCatalogTranslationBatchOptions
): Promise<FreeForDevCatalogTranslationBatch> {
  const catalog = await loadFreeForDevCatalog(cwd);
  const normalizedQuery = options.query?.trim().toLowerCase();
  const category = options.category?.trim().toLowerCase();
  const sourceCategory = options.sourceCategory?.trim().toLowerCase();
  const untranslatedOnly = options.untranslatedOnly ?? true;
  const offset = Math.max(0, options.offset ?? 0);
  const filtered = catalog.items.filter((item) => {
    if (!matchesFreeForDevCatalogItem(item, {
      category,
      sourceCategory,
      normalizedQuery,
      requestedLocale: options.locale
    })) {
      return false;
    }
    return !untranslatedOnly || !hasCompleteLocaleTranslation(item, options.locale);
  });
  const limit = clampLimit(options.limit, filtered.length);

  return {
    locale: options.locale,
    items: filtered.slice(offset, offset + limit).map((item) => toFreeForDevCatalogTranslationBatchItem(item, options.locale)),
    total: filtered.length,
    limit,
    offset,
    untranslatedOnly,
    source: catalog.source,
    stats: catalog.stats
  };
}

export async function applyFreeForDevCatalogTranslations(
  cwd: string,
  options: ApplyFreeForDevCatalogTranslationsOptions
): Promise<{ updated: number; missing: string[] }> {
  const catalogPath = resolveFreeForDevNormalizedCatalogPaths(cwd)[0] ?? join(cwd, "registry", "sources", "free-for-dev", "normalized.json");
  const catalog = await loadFreeForDevCatalog(cwd);
  const byId = new Map(options.translations.map((translation) => [translation.id, translation]));
  const missing = new Set(options.translations.map((translation) => translation.id));
  let updated = 0;

  const items = catalog.items.map((item) => {
    const translation = byId.get(item.id);
    if (!translation) {
      return item;
    }
    missing.delete(item.id);
    const existingLocale = item.enrichment?.localization?.[options.locale];
    const nextLocale = {
      ...(isRecord(existingLocale) ? existingLocale : {}),
      ...(translation.name === undefined ? {} : { name: translation.name }),
      ...(translation.description === undefined ? {} : { description: translation.description }),
      ...(translation.freeTierText === undefined ? {} : { freeTierText: translation.freeTierText }),
      status: "translated",
      reviewStatus: "needs_review",
      ...(options.translatedAt === undefined ? {} : { translatedAt: options.translatedAt })
    };
    if (isEnglishLocaleCopy(item, {
      name: typeof nextLocale.name === "string" ? nextLocale.name : undefined,
      description: typeof nextLocale.description === "string" ? nextLocale.description : undefined,
      freeTierText: typeof nextLocale.freeTierText === "string" ? nextLocale.freeTierText : undefined
    })) {
      const removed = removeFreeForDevCatalogLocale(item, options.locale);
      if (removed.changed) {
        return {
          ...item,
          ...(removed.enrichment === undefined ? {} : { enrichment: removed.enrichment })
        };
      }
      return item;
    }

    updated += 1;
    const localization = {
      ...(item.enrichment?.localization ?? {}),
      [options.locale]: {
        ...(isRecord(existingLocale) ? existingLocale : {}),
        ...(translation.name === undefined ? {} : { name: translation.name }),
        ...(translation.description === undefined ? {} : { description: translation.description }),
        ...(translation.freeTierText === undefined ? {} : { freeTierText: translation.freeTierText }),
        status: "translated",
        reviewStatus: "needs_review",
        ...(options.translatedAt === undefined ? {} : { translatedAt: options.translatedAt })
      }
    };

    return {
      ...item,
      enrichment: {
        ...(item.enrichment ?? {}),
        localization
      }
    };
  });

  await mkdir(dirname(catalogPath), { recursive: true });
  await writeJson(catalogPath, NormalizedCatalogFileSchema.parse({ ...catalog, items }));
  return {
    updated,
    missing: [...missing]
  };
}

export function resolveFreeForDevCatalogLocale(input: {
  explicitLocale?: FreeForDevCatalogLocale;
  query?: string;
  systemLocale?: string;
}): FreeForDevCatalogLocale {
  if (input.explicitLocale) {
    return input.explicitLocale;
  }

  const queryLocale = detectFreeForDevCatalogLocale(input.query);
  if (queryLocale) {
    return queryLocale;
  }

  return normalizeSystemLocale(input.systemLocale) ?? "en";
}

export function detectFreeForDevCatalogLocale(value: string | undefined): FreeForDevCatalogLocale | undefined {
  if (!value) {
    return undefined;
  }
  if (/[\u3040-\u30ff]/u.test(value)) {
    return "ja";
  }
  if (/[\uac00-\ud7af]/u.test(value)) {
    return "ko";
  }
  if (/[\u4e00-\u9fff]/u.test(value)) {
    return "zh-CN";
  }
  const tokens = value.toLowerCase().split(/[^a-zà-ÿñ¿¡]+/iu).filter(Boolean);
  if (tokens.some((token) => [
    "gratuit",
    "gratuite",
    "gratuits",
    "gratuites",
    "outil",
    "outils",
    "donnee",
    "donnees",
    "donnée",
    "données"
  ].includes(token))) {
    return "fr";
  }
  if (tokens.some((token) => [
    "gratis",
    "gratuito",
    "gratuita",
    "servicio",
    "servicios",
    "herramienta",
    "herramientas",
    "dato",
    "datos"
  ].includes(token))) {
    return "es";
  }
  if (/[àâæçèêëîïôœùûÿ]/iu.test(value)) {
    return "fr";
  }
  if (/[ñáíóú¿¡]/iu.test(value)) {
    return "es";
  }
  if (/[éü]/iu.test(value)) {
    return "fr";
  }
  return undefined;
}

function resolveFreeForDevNormalizedCatalogPaths(cwd: string): string[] {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return [
    join(cwd, "registry", "sources", "free-for-dev", "normalized.json"),
    join(moduleDir, "..", "..", "..", "registry", "sources", "free-for-dev", "normalized.json"),
    join(moduleDir, "..", "..", "..", "..", "..", "registry", "sources", "free-for-dev", "normalized.json")
  ];
}

function toFreeForDevCatalogItem(
  item: CatalogNormalizedItem,
  requestedLocale: FreeForDevCatalogLocale
): FreeForDevCatalogItem {
  const localized = getLocalizedItemFields(item, requestedLocale);

  return {
    id: item.id,
    name: localized.name ?? item.name,
    slug: item.slug,
    category: item.category,
    sourceCategory: item.sourceCategory,
    description: localized.description ?? item.description,
    url: item.url,
    capability: item.capability,
    freeTierText: localized.freeTierText ?? item.freeTierText,
    freeTierStatus: item.freeTierStatus,
    confidence: item.confidence,
    reviewStatus: item.reviewStatus,
    ...(item.matchedServiceId !== undefined ? { matchedServiceId: item.matchedServiceId } : {}),
    warnings: item.warnings,
    locale: localized.locale,
    requestedLocale,
    translationStatus: localized.translationStatus
  };
}

function getLocalizedItemFields(
  item: CatalogNormalizedItem,
  requestedLocale: FreeForDevCatalogLocale
): {
  name?: string;
  description?: string;
  freeTierText?: string;
  locale: FreeForDevCatalogLocale;
  translationStatus: FreeForDevCatalogItem["translationStatus"];
} {
  if (requestedLocale === "en") {
    return { locale: "en", translationStatus: "original" };
  }

  const localized = item.enrichment?.localization?.[requestedLocale];
  if (isRecord(localized)) {
    const name = typeof localized.name === "string" ? localized.name : undefined;
    const description = typeof localized.description === "string" ? localized.description : undefined;
    const freeTierText = typeof localized.freeTierText === "string" ? localized.freeTierText : undefined;
    if (isEnglishLocaleCopy(item, {
      name,
      description,
      freeTierText
    })) {
      return {
        locale: "en",
        translationStatus: "fallback"
      };
    }
    return {
      ...(name === undefined ? {} : { name }),
      ...(description === undefined ? {} : { description }),
      ...(freeTierText === undefined ? {} : { freeTierText }),
      locale: requestedLocale,
      translationStatus: localized.status === "translated" ? "translated" : "machine_translated"
    };
  }

  return {
    locale: "en",
    translationStatus: "fallback"
  };
}

function toFreeForDevCatalogTranslationBatchItem(
  item: CatalogNormalizedItem,
  locale: Exclude<FreeForDevCatalogLocale, "en">
): FreeForDevCatalogTranslationBatchItem {
  const existingTranslation = getExistingLocaleTranslation(item, locale);
  return {
    id: item.id,
    category: item.category,
    sourceCategory: item.sourceCategory,
    url: item.url,
    source: {
      name: item.name,
      description: item.description,
      freeTierText: item.freeTierText
    },
    ...(existingTranslation === undefined ? {} : { existingTranslation })
  };
}

function getExistingLocaleTranslation(
  item: CatalogNormalizedItem,
  locale: Exclude<FreeForDevCatalogLocale, "en">
): FreeForDevCatalogTranslationBatchItem["existingTranslation"] | undefined {
  const localized = item.enrichment?.localization?.[locale];
  if (!isRecord(localized)) {
    return undefined;
  }
  const name = typeof localized.name === "string" ? localized.name : undefined;
  const description = typeof localized.description === "string" ? localized.description : undefined;
  const freeTierText = typeof localized.freeTierText === "string" ? localized.freeTierText : undefined;
  const status = typeof localized.status === "string" ? localized.status : undefined;
  const reviewStatus = typeof localized.reviewStatus === "string" ? localized.reviewStatus : undefined;
  const translatedAt = typeof localized.translatedAt === "string" ? localized.translatedAt : undefined;

  return {
    id: item.id,
    ...(name === undefined ? {} : { name }),
    ...(description === undefined ? {} : { description }),
    ...(freeTierText === undefined ? {} : { freeTierText }),
    ...(status === undefined ? {} : { status }),
    ...(reviewStatus === undefined ? {} : { reviewStatus }),
    ...(translatedAt === undefined ? {} : { translatedAt })
  };
}

function isEnglishLocaleCopy(
  item: CatalogNormalizedItem,
  localization: {
    name?: string | undefined;
    description?: string | undefined;
    freeTierText?: string | undefined;
  }
): boolean {
  return (
    normalizeLocaleText(localization.name) === normalizeLocaleText(item.name)
    && normalizeLocaleText(localization.description) === normalizeLocaleText(item.description)
    && normalizeLocaleText(localization.freeTierText) === normalizeLocaleText(item.freeTierText)
  );
}

function removeFreeForDevCatalogLocale(
  item: CatalogNormalizedItem,
  locale: FreeForDevCatalogLocale
): { changed: boolean; enrichment?: CatalogNormalizedItem["enrichment"] } {
  const existingLocale = item.enrichment?.localization?.[locale];
  if (!isRecord(existingLocale)) {
    return {
      changed: false,
      enrichment: item.enrichment
    };
  }

  const existingLocalization = item.enrichment?.localization;
  if (existingLocalization === undefined) {
    return {
      changed: false,
      enrichment: item.enrichment
    };
  }

  const localization = { ...existingLocalization };
  delete localization[locale];

  if (Object.keys(localization).length === 0) {
    return {
      changed: true,
      enrichment: (() => {
        const remaining = item.enrichment
          ? Object.fromEntries(Object.entries(item.enrichment).filter(([key]) => key !== "localization"))
          : {};
        return Object.keys(remaining).length > 0 ? remaining : undefined;
      })()
    };
  }

  return {
    changed: true,
    enrichment: {
      ...(item.enrichment ?? {}),
      localization
    }
  };
}

function normalizeLocaleText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : value.trim().replace(/\s+/g, " ");
}

function hasCompleteLocaleTranslation(
  item: CatalogNormalizedItem,
  locale: Exclude<FreeForDevCatalogLocale, "en">
): boolean {
  const existing = getExistingLocaleTranslation(item, locale);
  return typeof existing?.name === "string"
    && typeof existing.description === "string"
    && typeof existing.freeTierText === "string"
    && !isEnglishLocaleCopy(item, existing);
}

function matchesFreeForDevCatalogItem(
  item: CatalogNormalizedItem,
  filters: {
    category?: string | undefined;
    sourceCategory?: string | undefined;
    normalizedQuery?: string | undefined;
    requestedLocale: FreeForDevCatalogLocale;
  }
): boolean {
  if (filters.category && item.category.toLowerCase() !== filters.category) {
    return false;
  }
  if (filters.sourceCategory && item.sourceCategory.toLowerCase() !== filters.sourceCategory) {
    return false;
  }
  if (!filters.normalizedQuery) {
    return true;
  }

  return scoreFreeForDevCatalogItem(item, filters.normalizedQuery, filters.requestedLocale) !== undefined;
}

function scoreFreeForDevCatalogItem(
  item: CatalogNormalizedItem,
  normalizedQuery: string,
  requestedLocale: FreeForDevCatalogLocale
): number | undefined {
  const display = toFreeForDevCatalogItem(item, requestedLocale);
  const primaryFields = [
    item.id,
    item.name,
    item.slug,
    item.category,
    item.sourceCategory,
    display.name,
    item.matchedServiceId ?? "",
    ...(item.enrichment?.tags ?? [])
  ];
  const fields = [
    ...primaryFields,
    item.description,
    item.freeTierText,
    display.description,
    display.freeTierText,
    item.url
  ];
  const primaryHaystack = primaryFields.join(" ").toLowerCase();
  const textHaystack = fields.join(" ").toLowerCase();
  const compactPrimaryHaystack = compactSearchText(primaryHaystack);
  const compactTextHaystack = compactSearchText(textHaystack);
  const terms = expandFreeForDevSearchTerms(normalizedQuery);

  let best: number | undefined;
  for (const term of terms) {
    const compactTerm = compactSearchText(term);
    if (!term || !compactTerm) {
      continue;
    }
    const candidateScore = scoreSearchTerm({
      term,
      compactTerm,
      primaryHaystack,
      textHaystack,
      compactPrimaryHaystack,
      compactTextHaystack,
      primaryFields
    });
    if (candidateScore !== undefined) {
      best = best === undefined ? candidateScore : Math.min(best, candidateScore);
    }
  }

  return best;
}

function scoreSearchTerm(input: {
  term: string;
  compactTerm: string;
  primaryHaystack: string;
  textHaystack: string;
  compactPrimaryHaystack: string;
  compactTextHaystack: string;
  primaryFields: string[];
}): number | undefined {
  if (input.primaryHaystack.includes(input.term)) {
    return 10;
  }
  if (input.compactPrimaryHaystack.includes(input.compactTerm)) {
    return 20;
  }

  const queryTokens = tokenizeSearchText(input.term);
  if (queryTokens.length > 0 && queryTokens.every((token) => input.primaryHaystack.includes(token))) {
    return 30;
  }

  const fieldTokens = input.primaryFields
    .flatMap((field) => tokenizeSearchText(field))
    .filter((token) => token.length <= 48);
  const fuzzyTokens = queryTokens.length > 0 ? queryTokens : [input.compactTerm];
  if (fuzzyTokens.some((queryToken) => fieldTokens.some((fieldToken) => isFuzzyTokenMatch(queryToken, fieldToken)))) {
    return 25;
  }

  if (input.textHaystack.includes(input.term) || input.compactTextHaystack.includes(input.compactTerm)) {
    return 35;
  }

  return undefined;
}

function expandFreeForDevSearchTerms(normalizedQuery: string): string[] {
  const terms = new Set([normalizedQuery]);
  const compactQuery = compactSearchText(normalizedQuery);
  if (compactQuery) {
    terms.add(compactQuery);
  }

  for (const [canonicalTerm, aliases] of Object.entries(freeForDevSearchAliases)) {
    const normalizedCanonical = canonicalTerm.toLowerCase();
    if (
      normalizedQuery === normalizedCanonical
      || compactQuery === compactSearchText(normalizedCanonical)
      || aliases.some((alias) => {
        const normalizedAlias = alias.toLowerCase();
        const compactAlias = compactSearchText(normalizedAlias);
        return normalizedQuery.includes(normalizedAlias)
          || (compactAlias.length > 0 && compactQuery.includes(compactAlias));
      })
    ) {
      terms.add(normalizedCanonical);
    }
  }

  return [...terms];
}

function compactSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]+/gu, "");
}

function tokenizeSearchText(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]+/gu)
    .filter((token) => token.length > 0);
}

function isFuzzyTokenMatch(queryToken: string, fieldToken: string): boolean {
  if (queryToken.length < 4 || fieldToken.length < 4) {
    return false;
  }
  const maxDistance = queryToken.length <= 6 ? 1 : 2;
  if (Math.abs(queryToken.length - fieldToken.length) > maxDistance) {
    return false;
  }
  if (fieldToken.includes(queryToken) || queryToken.includes(fieldToken)) {
    return true;
  }
  return levenshteinDistance(queryToken, fieldToken) <= maxDistance;
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + substitutionCost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] ?? Number.POSITIVE_INFINITY;
}

const freeForDevSearchAliases: Record<string, string[]> = {
  llm: [
    "ai",
    "artificial intelligence",
    "人工智能",
    "大模型",
    "语言模型",
    "生成式",
    "生成 ai",
    "エーアイ",
    "人工知能",
    "생성 ai",
    "인공지능",
    "intelligence artificielle",
    "ia générative",
    "inteligencia artificial",
    "ia generativa"
  ],
  database: [
    "数据库",
    "資料庫",
    "データベース",
    "데이터베이스",
    "base de données",
    "bases de données",
    "base de datos",
    "bases de datos"
  ],
  hosting: [
    "托管",
    "部署",
    "ホスティング",
    "デプロイ",
    "호스팅",
    "배포",
    "hébergement",
    "déploiement",
    "alojamiento",
    "despliegue"
  ],
  storage: [
    "存储",
    "对象存储",
    "ストレージ",
    "オブジェクトストレージ",
    "스토리지",
    "객체 스토리지",
    "stockage",
    "stockage objet",
    "almacenamiento",
    "almacenamiento de objetos"
  ]
};

function clampLimit(limit: number | undefined, defaultLimit: number): number {
  if (limit === undefined) {
    return defaultLimit;
  }
  if (!Number.isFinite(limit)) {
    return defaultLimit;
  }
  return Math.min(5000, Math.max(1, Math.floor(limit)));
}

function countBy(
  items: CatalogNormalizedItem[],
  getKey: (item: CatalogNormalizedItem) => string
): Array<{ id: string; name: string; count: number }> {
  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  for (const item of items) {
    const name = getKey(item);
    const id = slugifyLoose(name);
    counts.set(id, (counts.get(id) ?? 0) + 1);
    names.set(id, name);
  }

  return [...counts.entries()]
    .map(([id, count]) => ({ id, name: names.get(id) ?? id, count }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function slugifyLoose(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSystemLocale(value: string | undefined): FreeForDevCatalogLocale | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.replace("_", "-").toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }
  if (normalized.startsWith("ja")) {
    return "ja";
  }
  if (normalized.startsWith("ko")) {
    return "ko";
  }
  if (normalized.startsWith("fr")) {
    return "fr";
  }
  if (normalized.startsWith("es")) {
    return "es";
  }
  if (normalized.startsWith("en")) {
    return "en";
  }
  return undefined;
}

type CachedSourceMetadata = {
  name?: string;
  url?: string;
  rawUrl?: string;
  license?: string;
  importedAt?: string;
  parserVersion?: string;
  etag?: string;
  commitSha?: string;
  contentSha256?: string;
  rawSnapshotPath?: string;
  importSnapshotPath?: string;
  candidateCount?: number;
};

type CachedNormalizedCatalog = {
  items?: Array<{
    reviewStatus?: string;
    rawExcerptRef?: {
      path?: string;
    };
  }>;
  stats?: {
    skippedItemCount?: number;
  };
};

async function markFreeForDevSourceStale(cwd: string, now: string): Promise<RefreshFreeForDevResult> {
  const sourceRoot = join(cwd, "registry", "sources", "free-for-dev");
  const sourceMetadata = await readJsonIfExists<CachedSourceMetadata>(join(sourceRoot, "source.json"));
  const normalized = await readJsonIfExists<CachedNormalizedCatalog>(join(sourceRoot, "normalized.json"));
  const cachedRawSnapshotPath = sourceMetadata?.rawSnapshotPath
    ?? normalized?.items?.find((item) => item.rawExcerptRef?.path)?.rawExcerptRef?.path
    ?? "";
  const cachedImportSnapshotPath = sourceMetadata?.importSnapshotPath ?? "";

  if (sourceMetadata || normalized) {
    await writeJson(join(sourceRoot, "source.json"), {
      name: "free-for-dev",
      url: freeForDevSourceUrl,
      rawUrl: freeForDevRawUrl,
      license: sourceMetadata?.license ?? "unknown",
      ...(sourceMetadata?.importedAt ? { importedAt: sourceMetadata.importedAt } : {}),
      ...(sourceMetadata?.parserVersion ? { parserVersion: sourceMetadata.parserVersion } : { parserVersion: "1" }),
      ...(sourceMetadata?.etag ? { etag: sourceMetadata.etag } : {}),
      ...(sourceMetadata?.commitSha ? { commitSha: sourceMetadata.commitSha } : {}),
      ...(sourceMetadata?.contentSha256 ? { contentSha256: sourceMetadata.contentSha256 } : {}),
      ...(cachedRawSnapshotPath ? { rawSnapshotPath: cachedRawSnapshotPath } : {}),
      ...(cachedImportSnapshotPath ? { importSnapshotPath: cachedImportSnapshotPath } : {}),
      lastAttemptAt: now,
      lastStatus: "stale",
      stale: true,
      candidateCount: sourceMetadata?.candidateCount ?? normalized?.items?.length ?? 0
    });
  }

  return {
    imported: 0,
    updated: 0,
    skipped: normalized?.stats?.skippedItemCount ?? 0,
    needsReview: normalized?.items?.filter((item) => item.reviewStatus === "needs_review").length ?? 0,
    errors: 1,
    stale: true,
    rawSnapshotPath: cachedRawSnapshotPath,
    importSnapshotPath: cachedImportSnapshotPath
  };
}

async function defaultFetchText(url: string, options: FetchTextOptions = {}): Promise<FetchTextResult> {
  const response = await fetch(url, {
    ...(options.ifNoneMatch ? { headers: { "If-None-Match": options.ifNoneMatch } } : {})
  });
  if (response.status === 304) {
    const etag = response.headers.get("etag");
    return {
      notModified: true,
      ...(etag ? { etag } : {})
    };
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const etag = response.headers.get("etag");
  return {
    text: await response.text(),
    ...(etag ? { etag } : {})
  };
}

function toSnapshotStamp(iso: string): string {
  return iso.replace(/[^0-9A-Za-z]/g, "");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJsonIfExists<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
