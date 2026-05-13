import {
  CatalogEnrichmentSchema,
  NormalizedCatalogFileSchema,
  type CatalogNormalizedItem,
  type NormalizedCatalogFile
} from "../../schemas/index.js";
import { maskKnownSecretsInText } from "../../vault/index.js";

export type CatalogEnrichment = NonNullable<CatalogNormalizedItem["enrichment"]>;

export type CatalogEnrichmentProvider = {
  enrichItem: (item: CatalogNormalizedItem) => Promise<CatalogEnrichment | undefined>;
};

export async function applyCatalogEnrichment(
  catalog: NormalizedCatalogFile,
  provider: CatalogEnrichmentProvider
): Promise<NormalizedCatalogFile> {
  const parsedCatalog = NormalizedCatalogFileSchema.parse(catalog);
  const items = await Promise.all(
    parsedCatalog.items.map(async (item) => {
      const enrichment = await provider.enrichItem(item);

      if (!enrichment) {
        return item;
      }

      return {
        ...item,
        enrichment: CatalogEnrichmentSchema.parse(sanitizeValue(enrichment))
      };
    })
  );

  return NormalizedCatalogFileSchema.parse({
    ...parsedCatalog,
    items
  });
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return maskKnownSecretsInText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeValue(item)])
    );
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
