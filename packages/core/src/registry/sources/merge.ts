import {
  NormalizedCatalogFileSchema,
  type CatalogNormalizedItem,
  type NormalizedCatalogFile,
  type ServiceRecord
} from "../../schemas/index.js";

export type CatalogMergeAlias = {
  normalizedId?: string;
  normalizedSlug?: string;
  serviceId: string;
};

export type CatalogSourceMergeOptions = {
  aliases?: CatalogMergeAlias[];
};

export function mergeNormalizedCatalogWithServiceConfigs(
  catalog: NormalizedCatalogFile,
  services: ServiceRecord[],
  options: CatalogSourceMergeOptions = {}
): NormalizedCatalogFile {
  const parsedCatalog = NormalizedCatalogFileSchema.parse(catalog);
  const items = parsedCatalog.items.map((item) => {
    const matched = findMatchingService(item, services, options.aliases ?? []);
    if (!matched) {
      return item;
    }

    return {
      ...item,
      matchedServiceId: matched.id,
      warnings: appendUnique(item.warnings, `Matched local config: ${matched.id}`)
    };
  });

  return NormalizedCatalogFileSchema.parse({
    ...parsedCatalog,
    items
  });
}

function findMatchingService(
  item: CatalogNormalizedItem,
  services: ServiceRecord[],
  aliases: CatalogMergeAlias[]
): ServiceRecord | undefined {
  return findByExactUrl(item, services)
    ?? findByNormalizedUrl(item, services)
    ?? services.find((service) => service.slug === item.slug || service.id === item.slug)
    ?? findByAlias(item, services, aliases);
}

function findByExactUrl(item: CatalogNormalizedItem, services: ServiceRecord[]): ServiceRecord | undefined {
  return services.find((service) => serviceUrls(service).includes(item.url));
}

function findByNormalizedUrl(item: CatalogNormalizedItem, services: ServiceRecord[]): ServiceRecord | undefined {
  const normalizedItemUrl = normalizeServiceUrl(item.url);
  return services.find((service) => serviceUrls(service).some((url) => normalizeServiceUrl(url) === normalizedItemUrl));
}

function findByAlias(
  item: CatalogNormalizedItem,
  services: ServiceRecord[],
  aliases: CatalogMergeAlias[]
): ServiceRecord | undefined {
  const alias = aliases.find((candidate) => {
    return candidate.normalizedId === item.id || candidate.normalizedSlug === item.slug;
  });
  return alias ? services.find((service) => service.id === alias.serviceId) : undefined;
}

function serviceUrls(service: ServiceRecord): string[] {
  return [
    service.url,
    service.config?.urls?.homepage,
    service.config?.urls?.docs,
    service.config?.urls?.console,
    service.config?.urls?.apiKeys
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

function normalizeServiceUrl(value: string): string {
  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/+$/g, "");
    return `${url.hostname.toLowerCase()}${pathname}`;
  } catch {
    return value.toLowerCase().replace(/\/+$/g, "");
  }
}

function appendUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}
