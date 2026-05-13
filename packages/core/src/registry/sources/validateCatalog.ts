import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { readCatalogArtifacts } from "../catalog.js";
import { NormalizedCatalogFileSchema } from "../../schemas/index.js";

export type ValidateCatalogArtifactsOptions = {
  cwd?: string;
};

export async function validateCatalogArtifacts(options: ValidateCatalogArtifactsOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.env.INIT_CWD ?? process.cwd();
  const artifacts = await readCatalogArtifacts(cwd);
  const [sourceRaw, normalizedRaw] = await Promise.all([
    readFile(join(cwd, "registry", "sources", "free-for-dev", "source.json"), "utf8"),
    readFile(join(cwd, "registry", "sources", "free-for-dev", "normalized.json"), "utf8")
  ]);
  const serialized = JSON.stringify(artifacts) + sourceRaw + normalizedRaw;
  assertNoSecrets(serialized);
  validateSourceMetadata(JSON.parse(sourceRaw) as Record<string, unknown>);
  NormalizedCatalogFileSchema.parse(JSON.parse(normalizedRaw));

  if (artifacts.metadata.serviceCount !== artifacts.services.length) {
    throw new Error("Catalog metadata serviceCount does not match services.json");
  }
  const categoryServiceCount = artifacts.categories.reduce((sum, category) => sum + category.serviceCount, 0);
  if (categoryServiceCount !== artifacts.services.length) {
    throw new Error("Catalog categories serviceCount does not match services.json");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await validateCatalogArtifacts();
}

function validateSourceMetadata(source: Record<string, unknown>): void {
  if (source.name !== "free-for-dev") {
    throw new Error("free-for-dev source metadata has an invalid name");
  }
  if (typeof source.rawUrl !== "string" || !source.rawUrl.includes("raw.githubusercontent.com/ripienaar/free-for-dev")) {
    throw new Error("free-for-dev source metadata has an invalid rawUrl");
  }
}

function assertNoSecrets(serialized: string): void {
  if (
    /gsk_[A-Za-z0-9_]{8,}|sk-or-v1-[A-Za-z0-9_-]{8,}|AKIA[A-Za-z0-9]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|BEGIN PRIVATE KEY/i
      .test(serialized)
  ) {
    throw new Error("Catalog artifacts appear to contain secret values");
  }
}
