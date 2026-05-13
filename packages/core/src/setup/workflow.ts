import { generateEnvFiles, type EnvGenerationEntry } from "../env/index.js";
import { parseAgentOutput, type ParsedAgentOutputEntry } from "../parser/agentOutput.js";
import type { ServiceRecord, ServiceState } from "../schemas/index.js";
import {
  classifyVaultKey,
  maskSecretValue,
  type VaultService,
  type VaultEntryMetadata
} from "../vault/index.js";

export type SetupConnectionTestResult = {
  status: "passed" | "failed" | "skipped";
  ok: boolean;
  message: string;
  latencyMs?: number;
};

export type ProcessAgentOutputOptions = {
  service: ServiceRecord;
  text: string;
  vault: VaultService;
  testConnection?: (service: ServiceRecord, env: Record<string, string>) => Promise<SetupConnectionTestResult>;
};

export type SavedSetupEntry = {
  key: string;
  serviceId: string;
  maskedValue: string;
  valid: true;
  secret: boolean;
  public: boolean;
  valueRef: string;
};

export type FailedSetupEntry = {
  key: string;
  code: "SECRET_VALIDATION_FAILED" | "AGENT_OUTPUT_PARSE_FAILED";
  reason: string;
};

export type ProcessAgentOutputResult = {
  saved: SavedSetupEntry[];
  failed: FailedSetupEntry[];
  warnings: string[];
  state: ServiceState;
  env: {
    envLocal: string;
    envExample: string;
    warnings: string[];
  };
  testResult: SetupConnectionTestResult;
  archiveMarkdown: string;
};

type CandidateEntry = {
  key: string;
  value: string;
  source: ParsedAgentOutputEntry["source"];
};

export async function processAgentOutputForService(
  options: ProcessAgentOutputOptions
): Promise<ProcessAgentOutputResult> {
  const parsed = parseAgentOutput(options.text);
  if (parsed.entries.length === 0) {
    return {
      saved: [],
      failed: [{
        key: "agent_output",
        code: "AGENT_OUTPUT_PARSE_FAILED",
        reason: "No configuration entries were found in Agent output."
      }],
      warnings: parsed.warnings,
      state: "failed",
      env: generateEnvFiles([]),
      testResult: { status: "skipped", ok: true, message: "Skipped because parsing failed." },
      archiveMarkdown: renderArchive(options.service, "failed", [])
    };
  }

  const candidates = normalizeParsedEntries(options.service, parsed.entries);
  const validation = validateCandidates(options.service, candidates);
  const warnings = [...parsed.warnings, ...validation.warnings];

  if (validation.failed.length > 0) {
    return {
      saved: [],
      failed: validation.failed,
      warnings,
      state: "failed",
      env: generateEnvFiles([]),
      testResult: { status: "skipped", ok: true, message: "Skipped because validation failed." },
      archiveMarkdown: renderArchive(options.service, "failed", [])
    };
  }

  const saved: SavedSetupEntry[] = [];
  for (const candidate of validation.valid) {
    const entry = await options.vault.set(candidate.key, candidate.value, { serviceId: options.service.id });
    saved.push(toSavedEntry(options.service.id, candidate.value, entry));
  }

  const envState = getConfiguredState(options.service);
  const envEntries: EnvGenerationEntry[] = validation.valid.map((entry) => ({
    key: entry.key,
    value: entry.value,
    state: envState
  }));
  const env = generateEnvFiles(envEntries);
  const envValues = Object.fromEntries(validation.valid.map((entry) => [entry.key, entry.value]));
  const testResult = await runWorkflowTest(options, envValues);
  const state = deriveState(options.service, saved, validation.failed, testResult);

  return {
    saved,
    failed: validation.failed,
    warnings,
    state,
    env,
    testResult,
    archiveMarkdown: renderArchive(options.service, state, saved)
  };
}

function normalizeParsedEntries(service: ServiceRecord, entries: ParsedAgentOutputEntry[]): CandidateEntry[] {
  return entries.map((entry) => {
    if (service.capability.includes("config")) {
      return entry;
    }

    return {
      ...entry,
      key: scopeGenericKey(service, entry.key)
    };
  });
}

function scopeGenericKey(service: ServiceRecord, key: string): string {
  if (key.startsWith(`${service.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_`)) {
    return key;
  }

  const prefix = service.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return `${prefix}_${key}`;
}

function validateCandidates(
  service: ServiceRecord,
  candidates: CandidateEntry[]
): { valid: CandidateEntry[]; failed: FailedSetupEntry[]; warnings: string[] } {
  const envSpecs = service.config?.env ?? [];
  if (envSpecs.length === 0) {
    return { valid: candidates, failed: [], warnings: [] };
  }

  const byKey = new Map(candidates.map((candidate) => [candidate.key, candidate]));
  const expectedKeys = new Set(envSpecs.map((spec) => spec.key));
  const valid: CandidateEntry[] = [];
  const failed: FailedSetupEntry[] = [];
  const warnings: string[] = [];

  for (const spec of envSpecs) {
    const candidate = byKey.get(spec.key);
    if (!candidate) {
      if (spec.required) {
        failed.push({
          key: spec.key,
          code: "SECRET_VALIDATION_FAILED",
          reason: "Required key missing from Agent output."
        });
      }
      continue;
    }

    if (spec.pattern && !new RegExp(spec.pattern).test(candidate.value)) {
      failed.push({
        key: spec.key,
        code: "SECRET_VALIDATION_FAILED",
        reason: `Value does not match required pattern for ${spec.key}.`
      });
      continue;
    }

    valid.push(candidate);
  }

  for (const candidate of candidates) {
    if (!expectedKeys.has(candidate.key)) {
      warnings.push(`Unknown key ignored: ${candidate.key}`);
    }
  }

  return { valid, failed, warnings };
}

async function runWorkflowTest(
  options: ProcessAgentOutputOptions,
  env: Record<string, string>
): Promise<SetupConnectionTestResult> {
  if (!options.service.config?.test) {
    return { status: "skipped", ok: true, message: "Connection test is not supported for this service." };
  }
  if (!options.testConnection) {
    return { status: "skipped", ok: true, message: "No connection tester was provided." };
  }

  return options.testConnection(options.service, env);
}

function getConfiguredState(service: ServiceRecord): EnvGenerationEntry["state"] {
  return service.capability.includes("config") ? "configured" : "configured_unverified";
}

function deriveState(
  service: ServiceRecord,
  saved: SavedSetupEntry[],
  failed: FailedSetupEntry[],
  testResult: SetupConnectionTestResult
): ServiceState {
  if (failed.length > 0 || saved.length === 0) {
    return "failed";
  }
  if (!service.capability.includes("config")) {
    return "configured_unverified";
  }
  if (testResult.status === "passed") {
    return "tested";
  }
  if (testResult.status === "failed") {
    return "failed";
  }
  return "configured";
}

function toSavedEntry(serviceId: string, value: string, entry: VaultEntryMetadata): SavedSetupEntry {
  const classification = classifyVaultKey(entry.key);
  return {
    key: entry.key,
    serviceId,
    maskedValue: classification.secret ? maskSecretValue(value) : value,
    valid: true,
    secret: entry.secret,
    public: entry.public,
    valueRef: entry.valueRef
  };
}

function renderArchive(service: ServiceRecord, state: ServiceState, saved: SavedSetupEntry[]): string {
  return [
    `# ${service.name} Agent Output`,
    "",
    `State: ${state}`,
    `Saved at: ${new Date().toISOString()}`,
    "",
    "```env",
    ...saved.map((entry) => `${entry.key}=${entry.maskedValue}`),
    "```",
    ""
  ].join("\n");
}
