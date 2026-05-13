import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize } from "node:path";

import {
  BaipiaoError,
  applyFreeForDevCatalogTranslations,
  classifyVaultKey,
  findFreeForDevNormalizedCandidate,
  getFreeForDevCatalogCategories,
  getFreeForDevCatalogTranslationBatch,
  generateCatalogCandidatePrompt,
  generateEnvFiles,
  generateSetupPrompt,
  getServiceByIdOrSlug,
  loadServiceConfigs,
  maskSecretValue,
  parseAgentOutput,
  processAgentOutputForService,
  recommendStack,
  runConnectionTest,
  searchFreeForDevCatalog,
  type ConnectionTestFetch,
  type FreeForDevCatalogLocale,
  type ServiceCapability,
  type ServiceState,
  type ServiceRecord,
  type VaultService
} from "baipiao-core";

export type McpToolHandlerContext = {
  vault: VaultService;
  cwd?: string;
  writeClipboard?: (text: string) => Promise<void> | void;
  testFetch?: ConnectionTestFetch;
};

export function createMcpToolHandlers(context: McpToolHandlerContext) {
  return {
    async list_services(input: {
      query?: string;
      category?: string;
      capability?: ServiceCapability;
      systemLocale?: string;
      limit?: number;
    }) {
      const systemLocale = input.systemLocale ?? getSystemLocale();
      const result = await searchFreeForDevCatalog(context.cwd ?? process.cwd(), {
        ...(input.query === undefined ? {} : { query: input.query }),
        ...(input.category === undefined ? {} : { category: input.category }),
        ...(systemLocale === undefined ? {} : { systemLocale }),
        limit: input.limit ?? 20
      });
      const services = input.capability === undefined
        ? result.items
        : result.items.filter((item) => item.capability.includes(input.capability as ServiceCapability));
      return {
        detectedLanguage: result.requestedLocale,
        services: services.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          capability: item.capability,
          freeTierStatus: item.freeTierStatus
        }))
      };
    },

    async list_free_catalog_candidates(input: {
      query?: string;
      category?: string;
      sourceCategory?: string;
      locale?: FreeForDevCatalogLocale;
      systemLocale?: string;
      limit?: number;
      offset?: number;
    }) {
      const systemLocale = input.systemLocale ?? process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG;
      const result = await searchFreeForDevCatalog(context.cwd ?? process.cwd(), {
        ...(input.query === undefined ? {} : { query: input.query }),
        ...(input.category === undefined ? {} : { category: input.category }),
        ...(input.sourceCategory === undefined ? {} : { sourceCategory: input.sourceCategory }),
        ...(input.locale === undefined ? {} : { locale: input.locale }),
        ...(systemLocale === undefined ? {} : { systemLocale }),
        ...(input.limit === undefined ? {} : { limit: input.limit }),
        ...(input.offset === undefined ? {} : { offset: input.offset })
      });
      return {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        requestedLocale: result.requestedLocale,
        source: {
          id: result.source.id,
          url: result.source.url,
          rawUrl: result.source.rawUrl,
          fetchedAt: result.source.fetchedAt,
          stale: result.source.stale
        },
        stats: result.stats
      };
    },

    async get_free_catalog_categories(_input: { locale?: FreeForDevCatalogLocale }) {
      return getFreeForDevCatalogCategories(context.cwd ?? process.cwd());
    },

    async apply_free_catalog_translations(input: {
      locale: Exclude<FreeForDevCatalogLocale, "en">;
      translations: Array<{ id: string; name?: string; description?: string; freeTierText?: string }>;
    }) {
      return applyFreeForDevCatalogTranslations(context.cwd ?? process.cwd(), {
        locale: input.locale,
        translations: input.translations,
        translatedAt: new Date().toISOString()
      });
    },

    async get_free_catalog_translation_batch(input: {
      locale: Exclude<FreeForDevCatalogLocale, "en">;
      query?: string;
      category?: string;
      sourceCategory?: string;
      limit?: number;
      offset?: number;
      untranslatedOnly?: boolean;
    }) {
      return getFreeForDevCatalogTranslationBatch(context.cwd ?? process.cwd(), {
        locale: input.locale,
        ...(input.query === undefined ? {} : { query: input.query }),
        ...(input.category === undefined ? {} : { category: input.category }),
        ...(input.sourceCategory === undefined ? {} : { sourceCategory: input.sourceCategory }),
        ...(input.limit === undefined ? {} : { limit: input.limit }),
        ...(input.offset === undefined ? {} : { offset: input.offset }),
        ...(input.untranslatedOnly === undefined ? {} : { untranslatedOnly: input.untranslatedOnly })
      });
    },

    async get_service_info(input: { serviceId: string }) {
      const service = await findService(input.serviceId);
      return {
        service: {
          id: service.id,
          name: service.name,
          category: service.category,
          urls: service.config?.urls ?? {},
          env: (service.config?.env ?? []).map((entry) => ({
            key: entry.key,
            secret: entry.secret,
            public: entry.public ?? false,
            required: entry.required
          })),
          freeTier: service.config?.freeTier,
          capability: service.capability,
          risks: service.config?.risks ?? []
        }
      };
    },

    async generate_setup_prompt(input: { serviceId: string; projectSlug?: string }) {
      const service = await tryFindService(input.serviceId);
      if (!service) {
        const candidate = context.cwd
          ? await findFreeForDevNormalizedCandidate(context.cwd, input.serviceId)
          : undefined;
        if (!candidate) {
          throw new BaipiaoError("SERVICE_NOT_FOUND", `Service not found: ${input.serviceId}`);
        }
        return {
          serviceId: candidate.id,
          serviceName: candidate.name,
          prompt: generateCatalogCandidatePrompt(candidate, { projectSlug: input.projectSlug ?? "project" }),
          outputFormat: ["KEY=VALUE"],
          requiredEnvKeys: [],
          capability: candidate.capability,
          source: candidate.source,
          reviewStatus: candidate.reviewStatus,
          mode: "generic" as const
        };
      }
      const requiredEnvKeys = (service.config?.env ?? [])
        .filter((entry) => entry.required)
        .map((entry) => entry.key);
      return {
        serviceId: service.id,
        serviceName: service.name,
        prompt: generateSetupPrompt(service, { projectSlug: input.projectSlug ?? "project" }),
        outputFormat: requiredEnvKeys.length > 0 ? requiredEnvKeys.map((key) => `${key}=...`) : ["KEY=VALUE"],
        requiredEnvKeys,
        capability: service.capability,
        source: service.source,
        reviewStatus: "reviewed",
        mode: service.capability.includes("config") ? "structured" : "generic"
      };
    },

    parse_agent_output(input: { serviceId?: string; text: string }) {
      const parsed = parseAgentOutput(input.text);
      return {
        entries: parsed.entries.map((entry) => {
          const secret = /KEY|TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL|ACCESS_KEY|SERVICE_ROLE/.test(entry.key);
          return {
            key: entry.key,
            ...(input.serviceId ? { serviceId: input.serviceId } : {}),
            scope: secret ? "server" : "unknown",
            secret,
            ...(secret ? { maskedValue: maskSecretValue(entry.value) } : { value: entry.value }),
            valid: true,
            source: entry.source,
            warnings: []
          };
        }),
        notes: [],
        warnings: parsed.warnings
      };
    },

    async save_agent_output(input: { serviceId: string; text: string }) {
      const service = await findService(input.serviceId);
      const result = await processAgentOutputForService({
        service,
        text: input.text,
        vault: context.vault,
        testConnection: (targetService, env) => {
          const options: Parameters<typeof runConnectionTest>[0] = { service: targetService, env };
          if (context.testFetch) {
            options.fetch = context.testFetch;
          }
          return runConnectionTest(options);
        }
      });
      return {
        saved: result.saved,
        failed: result.failed,
        state: result.state,
        testResult: result.testResult
      };
    },

    async validate_secret(input: { key: string; value: string }) {
      const services = await loadServiceConfigs();
      const matchingSpecs = services.flatMap((service) => (service.config?.env ?? [])
        .filter((entry) => entry.key === input.key)
        .map((entry) => ({ serviceId: service.id, pattern: entry.pattern })));
      const failedSpec = matchingSpecs.find((entry) => entry.pattern && !new RegExp(entry.pattern).test(input.value));

      return {
        key: input.key,
        valid: failedSpec === undefined,
        serviceIds: matchingSpecs.map((entry) => entry.serviceId),
        ...(failedSpec ? { reason: `Value does not match required pattern for ${input.key}.` } : {})
      };
    },

    async vault_list(input: { serviceId?: string }) {
      const entries = (await context.vault.list())
        .filter((entry) => !input.serviceId || entry.serviceId === input.serviceId)
        .map((entry) => ({
          key: entry.key,
          ...(entry.serviceId ? { serviceId: entry.serviceId } : {}),
          status: entry.status,
          scope: entry.scope,
          ...(entry.lastUpdatedAt ? { lastUpdatedAt: entry.lastUpdatedAt } : {}),
          ...(entry.lastTestAt ? { lastTestAt: entry.lastTestAt } : {})
        }));
      return { entries };
    },

    async vault_set(input: { key: string; value: string; serviceId?: string }) {
      const entry = await context.vault.set(input.key, input.value, {
        ...(input.serviceId ? { serviceId: input.serviceId } : {})
      });
      return {
        key: entry.key,
        saved: true,
        ...(entry.serviceId ? { serviceId: entry.serviceId } : {})
      };
    },

    async vault_import(input: { text: string; serviceId?: string }) {
      const parsed = parseAgentOutput(input.text);
      const saved = [];
      for (const entry of parsed.entries) {
        const savedEntry = await context.vault.set(entry.key, entry.value, {
          ...(input.serviceId ? { serviceId: input.serviceId } : {})
        });
        saved.push({
          key: savedEntry.key,
          ...(savedEntry.serviceId ? { serviceId: savedEntry.serviceId } : {}),
          status: savedEntry.status,
          scope: savedEntry.scope
        });
      }
      return {
        saved,
        failed: [],
        warnings: parsed.warnings
      };
    },

    async vault_copy(input: { key: string }) {
      const value = await context.vault.get(input.key);
      await context.writeClipboard?.(value);
      return {
        key: input.key,
        copied: context.writeClipboard !== undefined
      };
    },

    async vault_remove(input: { key: string }) {
      await context.vault.remove(input.key);
      return {
        key: input.key,
        removed: true
      };
    },

    async vault_health(_input: Record<string, never>) {
      const entries = await context.vault.list();
      return {
        items: entries.map((entry) => ({
          key: entry.key,
          ...(entry.serviceId ? { serviceId: entry.serviceId } : {}),
          status: entry.status === "stored" ? getHealthStatus(entry.key) : entry.status,
          message: getHealthMessage(entry.key, entry.status)
        }))
      };
    },

    async generate_env(input: { path?: string; example?: boolean; includeUnverified?: boolean }) {
      const cwd = context.cwd ?? process.cwd();
      const entries = await context.vault.list();
      const generationEntries = [];
      for (const entry of entries) {
        if (entry.status !== "stored") {
          continue;
        }
        generationEntries.push({
          key: entry.key,
          value: await context.vault.get(entry.key),
          state: "configured" as const
        });
      }
      const generated = generateEnvFiles(generationEntries, {
        ...(input.includeUnverified ? { includeUnverified: true } : {})
      });
      const targetPath = input.path ?? (input.example ? ".env.example" : ".env.local");
      const outputPath = resolveOutputPath(cwd, targetPath);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, input.example ? generated.envExample : generated.envLocal, "utf8");
      return {
        path: targetPath,
        writtenKeys: generationEntries.map((entry) => entry.key),
        missingKeys: []
      };
    },

    async test_connection(input: { serviceId: string }) {
      const service = await findService(input.serviceId);
      const result = await runConnectionTest({
        service,
        env: await loadVaultEnv(context.vault, service),
        ...(context.testFetch ? { fetch: context.testFetch } : {})
      });
      return {
        serviceId: service.id,
        ok: result.ok,
        status: result.status,
        message: result.message,
        ...(result.latencyMs === undefined ? {} : { latencyMs: result.latencyMs })
      };
    },

    async get_status(_input: Record<string, never>) {
      const entries = await context.vault.list();
      const stored = entries.filter((entry) => entry.status === "stored");
      return {
        project: {
          cwd: context.cwd ?? process.cwd()
        },
        services: entries.map((entry) => ({
          serviceId: entry.serviceId ?? "unknown",
          key: entry.key,
          state: toServiceState(entry.status)
        })),
        vault: {
          entryCount: entries.length,
          storedCount: stored.length
        },
        env: {
          ready: stored.length > 0
        },
        test: {
          status: "not_run"
        }
      };
    },

    recommend_stack(input: { useCase: Parameters<typeof recommendStack>[0] }) {
      return {
        stack: recommendStack(input.useCase)
      };
    },

    callForbiddenTool(toolName: string): Promise<never> {
      return Promise.reject(new BaipiaoError(
        "MCP_TOOL_FAILED",
        `Forbidden MCP tool is not available: ${toolName}`,
        { recoverable: true }
      ));
    }
  };
}

async function findService(serviceId: string) {
  const service = await tryFindService(serviceId);
  if (!service) {
    throw new BaipiaoError("SERVICE_NOT_FOUND", `Service not found: ${serviceId}`);
  }
  return service;
}

async function tryFindService(serviceId: string) {
  return getServiceByIdOrSlug(await loadServiceConfigs(), serviceId);
}

async function loadVaultEnv(vault: VaultService, service: ServiceRecord): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  for (const spec of service.config?.env ?? []) {
    try {
      env[spec.key] = await vault.get(spec.key);
    } catch {
      // Missing values are reported by the connection tester with a stable, redacted message.
    }
  }
  return env;
}

function getHealthStatus(key: string): "ok" | "warning" {
  return classifyVaultKey(key).scope === "server" ? "warning" : "ok";
}

function getHealthMessage(key: string, status: string): string {
  if (status !== "stored") {
    return `${key} is ${status}.`;
  }
  if (classifyVaultKey(key).scope === "server") {
    return `${key} is server-only; do not expose it to clients.`;
  }
  return `${key} is stored.`;
}

function getSystemLocale(): string | undefined {
  return process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG;
}

function toServiceState(status: string): ServiceState {
  return status === "stored" ? "configured" : "not_started";
}

function resolveOutputPath(cwd: string, targetPath: string): string {
  const normalized = normalize(targetPath);
  if (isAbsolute(normalized) || normalized.startsWith("..")) {
    throw new BaipiaoError("MCP_TOOL_FAILED", "generate_env path must stay inside the project directory.");
  }
  return join(cwd, normalized);
}
