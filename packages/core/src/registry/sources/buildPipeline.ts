import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NormalizedCatalogFileSchema } from "../../schemas/index.js";
import { writeCatalogArtifacts } from "../catalog.js";
import { loadServiceConfigs } from "../configs.js";
import { applyCatalogEnrichment, type CatalogEnrichmentProvider } from "./enrichment.js";
import { refreshFreeForDevSource, type FetchTextResult } from "./freeForDev.js";
import { mergeNormalizedCatalogWithServiceConfigs } from "./merge.js";

export type CatalogBuildPipelineOptions = {
  cwd?: string;
  now?: string;
  fetchText?: (url: string) => Promise<FetchTextResult>;
  enrichItem?: CatalogEnrichmentProvider["enrichItem"];
};

export type CatalogBuildPipelineSummary = {
  source: "free-for-dev";
  imported: number;
  updated: number;
  skipped: number;
  needsReview: number;
  accepted: number;
  rejected: number;
  warnings: number;
  errors: number;
  stale: boolean;
  runtimeServiceCount: number;
  runtimeCategoryCount: number;
};

type NormalizedCatalogReviewSummary = {
  stats?: {
    warningCount?: number;
  };
  items?: Array<{
    reviewStatus?: string;
  }>;
};

export async function runCatalogBuildPipeline(
  options: CatalogBuildPipelineOptions = {}
): Promise<CatalogBuildPipelineSummary> {
  const cwd = options.cwd ?? process.env.INIT_CWD ?? process.cwd();
  const refresh = await refreshFreeForDevSource({
    cwd,
    ...(options.now ? { now: options.now } : {}),
    ...(options.fetchText ? { fetchText: options.fetchText } : {})
  });
  if (options.enrichItem && !refresh.stale) {
    await enrichFreeForDevArtifacts(cwd, refresh.importSnapshotPath, options.enrichItem);
  }
  const services = await loadServiceConfigs(join(cwd, "registry", "configs"));
  if (!refresh.stale) {
    await mergeFreeForDevArtifacts(cwd, refresh.importSnapshotPath, services);
  }
  const review = await readReviewSummary(cwd);
  const artifacts = await writeCatalogArtifacts({ cwd, services, ...(options.now ? { generatedAt: options.now } : {}) });
  validateRuntimeArtifacts(artifacts.metadata.serviceCount, artifacts.services.length);

  return {
    source: "free-for-dev",
    imported: refresh.imported,
    updated: refresh.updated,
    skipped: refresh.skipped,
    needsReview: refresh.needsReview,
    accepted: review.accepted,
    rejected: review.rejected,
    warnings: review.warnings,
    errors: refresh.errors,
    stale: refresh.stale,
    runtimeServiceCount: artifacts.metadata.serviceCount,
    runtimeCategoryCount: artifacts.metadata.categoryCount
  };
}

async function enrichFreeForDevArtifacts(
  cwd: string,
  importSnapshotPath: string,
  enrichItem: CatalogEnrichmentProvider["enrichItem"]
): Promise<void> {
  const normalizedPath = join(cwd, "registry", "sources", "free-for-dev", "normalized.json");
  const normalized = NormalizedCatalogFileSchema.parse(JSON.parse(await readFile(normalizedPath, "utf8")));
  const enriched = await applyCatalogEnrichment(normalized, { enrichItem });

  await Promise.all([
    writeJson(normalizedPath, enriched),
    ...(importSnapshotPath ? [writeJson(join(cwd, importSnapshotPath), enriched)] : [])
  ]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await runCatalogBuildPipeline();
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function mergeFreeForDevArtifacts(
  cwd: string,
  importSnapshotPath: string,
  services: Awaited<ReturnType<typeof loadServiceConfigs>>
): Promise<void> {
  const normalizedPath = join(cwd, "registry", "sources", "free-for-dev", "normalized.json");
  const normalized = NormalizedCatalogFileSchema.parse(JSON.parse(await readFile(normalizedPath, "utf8")));
  const merged = mergeNormalizedCatalogWithServiceConfigs(normalized, services);

  await Promise.all([
    writeJson(normalizedPath, merged),
    ...(importSnapshotPath ? [writeJson(join(cwd, importSnapshotPath), merged)] : [])
  ]);
}

async function readReviewSummary(cwd: string): Promise<{ accepted: number; rejected: number; warnings: number }> {
  const parsed = JSON.parse(
    await readFile(join(cwd, "registry", "sources", "free-for-dev", "normalized.json"), "utf8")
  ) as NormalizedCatalogReviewSummary;
  return {
    accepted: parsed.items?.filter((item) => item.reviewStatus === "accepted" || item.reviewStatus === "reviewed").length ?? 0,
    rejected: parsed.items?.filter((item) => item.reviewStatus === "rejected").length ?? 0,
    warnings: parsed.stats?.warningCount ?? 0
  };
}

function validateRuntimeArtifacts(metadataServiceCount: number, actualServiceCount: number): void {
  if (metadataServiceCount !== actualServiceCount) {
    throw new Error("Catalog metadata serviceCount does not match generated services.");
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
