import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

import {
  ServiceCapabilitySchema,
  ServiceRecordSchema,
  type ServiceCapability,
  type ServiceRecord
} from "../schemas/index.js";
import {
  detectFreeForDevCatalogLocale,
  type FreeForDevCatalogLocale
} from "./sources/freeForDev.js";

export type ServiceSearchQuery = {
  query?: string;
  category?: string;
  capability?: ServiceCapability;
  systemLocale?: string;
  limit?: number;
};

export type ServiceSearchLanguage = FreeForDevCatalogLocale;

export async function loadServiceConfigs(registryDir?: string): Promise<ServiceRecord[]> {
  const resolvedRegistryDir = registryDir ?? await resolveDefaultRegistryConfigDir();
  const filenames = (await readdir(resolvedRegistryDir))
    .filter((filename) => filename.endsWith(".yaml") || filename.endsWith(".yml"))
    .sort();

  const services = await Promise.all(filenames.map(async (filename) => {
    const raw = await readFile(join(resolvedRegistryDir, filename), "utf8");
    const parsed = parse(raw) as unknown;
    return ServiceRecordSchema.parse(parsed);
  }));

  return services.sort((left, right) => serviceSortRank(left) - serviceSortRank(right));
}

export function getServiceByIdOrSlug(services: ServiceRecord[], idOrSlug: string): ServiceRecord | undefined {
  return services.find((service) => service.id === idOrSlug || service.slug === idOrSlug);
}

export function searchServices(services: ServiceRecord[], query: ServiceSearchQuery): ServiceRecord[] {
  const normalizedQuery = query.query?.trim().toLowerCase();
  const searchTerms = expandServiceSearchTerms(normalizedQuery);
  const capability = query.capability ? ServiceCapabilitySchema.parse(query.capability) : undefined;

  const results = services.filter((service) => {
    if (query.category && service.category !== query.category) {
      return false;
    }
    if (capability && !service.capability.includes(capability)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      service.id,
      service.name,
      service.slug,
      service.category,
      service.description ?? "",
      ...(service.tags ?? [])
    ].join(" ").toLowerCase();

    return searchTerms.some((term) => haystack.includes(term));
  });

  return typeof query.limit === "number" ? results.slice(0, query.limit) : results;
}

export function resolveServiceSearchLanguage(query: ServiceSearchQuery): ServiceSearchLanguage {
  return detectFreeForDevCatalogLocale(query.query) ?? normalizeSystemLocale(query.systemLocale) ?? "en";
}

function serviceSortRank(service: ServiceRecord): number {
  const ranks: Record<string, number> = {
    groq: 10,
    openrouter: 20,
    gemini: 30,
    supabase: 40,
    "cloudflare-r2": 50,
    vercel: 60
  };

  return ranks[service.id] ?? 1000;
}

function expandServiceSearchTerms(normalizedQuery: string | undefined): string[] {
  if (!normalizedQuery) {
    return [];
  }

  const terms = new Set([normalizedQuery]);
  for (const [canonicalTerm, aliases] of Object.entries(serviceSearchAliases)) {
    if (normalizedQuery === canonicalTerm || aliases.some((alias) => matchesServiceSearchAlias(normalizedQuery, alias))) {
      terms.add(canonicalTerm);
    }
  }

  return [...terms];
}

function matchesServiceSearchAlias(normalizedQuery: string, alias: string): boolean {
  if (alias.length <= 2) {
    return normalizedQuery.split(/[^a-z0-9]+/u).includes(alias);
  }
  return normalizedQuery.includes(alias);
}

const serviceSearchAliases: Record<string, string[]> = {
  llm: [
    "ai",
    "人工智能",
    "大模型",
    "语言模型",
    "生成式",
    "生成 ai",
    "生成式 ai",
    "生成ai",
    "エーアイ",
    "人工知能",
    "生成 ai",
    "에이아이",
    "인공지능",
    "생성 ai",
    "intelligence artificielle",
    "ia generative",
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
  object_storage: [
    "storage",
    "存储",
    "对象存储",
    "オブジェクトストレージ",
    "ストレージ",
    "객체 스토리지",
    "스토리지",
    "stockage objet",
    "stockage",
    "almacenamiento de objetos",
    "almacenamiento"
  ],
  hosting: [
    "托管",
    "部署",
    "ホスティング",
    "デプロイ",
    "호스팅",
    "배포",
    "hébergement",
    "deploiement",
    "déploiement",
    "alojamiento",
    "despliegue"
  ]
};

function normalizeSystemLocale(value: string | undefined): ServiceSearchLanguage | undefined {
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

async function resolveDefaultRegistryConfigDir(): Promise<string> {
  if (process.env.BAIPIAO_REGISTRY_CONFIG_DIR) {
    return process.env.BAIPIAO_REGISTRY_CONFIG_DIR;
  }

  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), "registry", "configs"),
    join(moduleDir, "..", "..", "registry", "configs"),
    join(moduleDir, "..", "..", "..", "..", "registry", "configs")
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? join(process.cwd(), "registry", "configs");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
