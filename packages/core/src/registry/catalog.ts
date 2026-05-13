import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ServiceRecordSchema, type ServiceRecord } from "../schemas/index.js";

export type CatalogCategory = {
  id: string;
  name: string;
  serviceCount: number;
};

export type CatalogMetadata = {
  schemaVersion: "baipiao.catalog.v1";
  generatedAt: string;
  serviceCount: number;
  categoryCount: number;
};

export type CatalogArtifacts = {
  services: ServiceRecord[];
  categories: CatalogCategory[];
  metadata: CatalogMetadata;
};

export type WriteCatalogArtifactsOptions = {
  cwd: string;
  services: ServiceRecord[];
  generatedAt?: string;
};

export function generateCatalogArtifacts(
  services: ServiceRecord[],
  generatedAt = new Date().toISOString()
): CatalogArtifacts {
  const categories = buildCategories(services);
  return {
    services,
    categories,
    metadata: {
      schemaVersion: "baipiao.catalog.v1",
      generatedAt,
      serviceCount: services.length,
      categoryCount: categories.length
    }
  };
}

export async function writeCatalogArtifacts(options: WriteCatalogArtifactsOptions): Promise<CatalogArtifacts> {
  const artifacts = generateCatalogArtifacts(options.services, options.generatedAt);
  const outputDir = join(options.cwd, "registry", "catalog");
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeJson(join(outputDir, "services.json"), artifacts.services),
    writeJson(join(outputDir, "categories.json"), artifacts.categories),
    writeJson(join(outputDir, "metadata.json"), artifacts.metadata)
  ]);
  return artifacts;
}

export async function readCatalogArtifacts(cwd = process.cwd()): Promise<CatalogArtifacts> {
  const catalogDir = join(cwd, "registry", "catalog");
  const [servicesRaw, categoriesRaw, metadataRaw] = await Promise.all([
    readFile(join(catalogDir, "services.json"), "utf8"),
    readFile(join(catalogDir, "categories.json"), "utf8"),
    readFile(join(catalogDir, "metadata.json"), "utf8")
  ]);

  const services = JSON.parse(servicesRaw) as unknown[];
  return {
    services: services.map((service) => ServiceRecordSchema.parse(service)),
    categories: JSON.parse(categoriesRaw) as CatalogCategory[],
    metadata: JSON.parse(metadataRaw) as CatalogMetadata
  };
}

function buildCategories(services: ServiceRecord[]): CatalogCategory[] {
  const counts = new Map<string, number>();
  for (const service of services) {
    counts.set(service.category, (counts.get(service.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, serviceCount]) => ({
      id,
      name: formatCategoryName(id),
      serviceCount
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function formatCategoryName(category: string): string {
  if (category === "llm") {
    return "LLM";
  }
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
