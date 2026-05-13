import { BaipiaoError } from "../errors/index.js";
import {
  CatalogNormalizedItemSchema,
  ServiceRecordSchema,
  type CatalogNormalizedItem,
  type ServiceRecord
} from "../schemas/index.js";

export type GenerateSetupPromptOptions = {
  projectSlug: string;
};

type PromptConfig = {
  setupUrl?: string;
  projectNamePattern?: string;
  steps?: string[];
  safety?: string[];
  outputFormat?: string[];
};

const DEFAULT_SAFETY_RULES = [
  "If login, CAPTCHA, email verification, or 2FA is required, pause and ask the user to complete it manually.",
  "Do not click Billing, Upgrade, Payment, Subscribe, Add payment method, or enable paid features.",
  "Do not save website login passwords."
];

export function generateSetupPrompt(service: ServiceRecord, options: GenerateSetupPromptOptions): string {
  try {
    const parsedService = ServiceRecordSchema.parse(service);
    const prompt = parsedService.config?.prompt as PromptConfig | undefined;
    if (prompt && parsedService.capability.includes("config")) {
      return renderStructuredPrompt(parsedService, prompt, options);
    }

    return renderGenericPrompt(parsedService);
  } catch (error) {
    throw toPromptGenerationError(error);
  }
}

export function generateCatalogCandidatePrompt(
  candidate: CatalogNormalizedItem,
  options: GenerateSetupPromptOptions
): string {
  try {
    return renderCatalogCandidatePrompt(CatalogNormalizedItemSchema.parse(candidate), options);
  } catch (error) {
    throw toPromptGenerationError(error);
  }
}

function renderCatalogCandidatePrompt(
  parsedCandidate: CatalogNormalizedItem,
  options: GenerateSetupPromptOptions
): string {
  const enrichment = parsedCandidate.enrichment;

  return [
    `Goal: Configure ${parsedCandidate.name} for ${options.projectSlug}.`,
    `External catalog source: ${parsedCandidate.source.id}.`,
    `Review status: ${parsedCandidate.reviewStatus}.`,
    `Homepage: ${parsedCandidate.url}`,
    `Description: ${parsedCandidate.description}`,
    `Free tier: ${parsedCandidate.freeTierText}`,
    ...(parsedCandidate.warnings.length > 0 ? [`Warnings: ${parsedCandidate.warnings.join("; ")}`] : []),
    ...(enrichment ? [
      "",
      "Unreviewed enrichment suggestions:",
      ...renderEnrichmentUrls(enrichment.urls),
      ...renderEnrichmentList("Setup hints", enrichment.setupHints),
      ...renderEnvKeyHints(enrichment.envKeyHints),
      ...renderEnrichmentList("Enrichment warnings", enrichment.warnings)
    ] : []),
    "",
    "Safety rules:",
    "- Use public account pages only.",
    "- Do not enable billing, upgrade plans, or save account passwords.",
    "- If a value is unknown, do not invent it.",
    "",
    "Output only configuration lines:",
    "KEY=VALUE"
  ].join("\n");
}

function toPromptGenerationError(error: unknown): BaipiaoError {
  if (error instanceof BaipiaoError) {
    return error;
  }

  return new BaipiaoError(
    "PROMPT_GENERATION_FAILED",
    "PROMPT_GENERATION_FAILED: Failed to generate setup prompt.",
    { details: error instanceof Error ? error.message : String(error) }
  );
}

function renderEnrichmentUrls(urls: CatalogNormalizedItem["enrichment"] extends infer Enrichment
  ? Enrichment extends { urls?: infer Urls } ? Urls : never
  : never): string[] {
  if (!urls) {
    return [];
  }

  const labels: Array<[keyof typeof urls, string]> = [
    ["docs", "Docs"],
    ["console", "Console"],
    ["apiKeys", "API keys"],
    ["pricing", "Pricing"],
    ["status", "Status"]
  ];

  return labels.flatMap(([key, label]) => {
    const value = urls[key];
    return value ? [`- ${label}: ${value}`] : [];
  });
}

function renderEnrichmentList(label: string, values: string[] | undefined): string[] {
  if (!values || values.length === 0) {
    return [];
  }

  return [
    `- ${label}:`,
    ...values.map((value) => `  - ${value}`)
  ];
}

function renderEnvKeyHints(
  hints: NonNullable<CatalogNormalizedItem["enrichment"]>["envKeyHints"]
): string[] {
  if (!hints || hints.length === 0) {
    return [];
  }

  return [
    "- Env key hints:",
    ...hints.map((hint) => `  - ${hint.key} (${hint.kind}, ${hint.confidence})`)
  ];
}

function renderStructuredPrompt(
  service: ServiceRecord,
  prompt: PromptConfig,
  options: GenerateSetupPromptOptions
): string {
  const setupUrl = prompt.setupUrl ?? service.config?.urls?.apiKeys ?? service.url;
  const projectName = (prompt.projectNamePattern ?? "baipiao-${project_slug}")
    .replaceAll("${project_slug}", options.projectSlug);
  const safety = [...DEFAULT_SAFETY_RULES, ...(prompt.safety ?? [])];
  const outputFormat = prompt.outputFormat ?? service.config?.env?.map((env) => `${env.key}=...`) ?? ["KEY=VALUE"];

  return [
    `Goal: Configure ${service.name} for this project.`,
    `Entry page: ${setupUrl}`,
    `Use name: ${projectName}`,
    "",
    "Steps:",
    ...(prompt.steps ?? []).map((step, index) => `${index + 1}. ${step.replaceAll("${project_slug}", options.projectSlug)}`),
    "",
    "Safety rules:",
    ...safety.map((rule) => `- ${rule}`),
    "",
    "Output only:",
    ...outputFormat.map((line) => line.replaceAll("${project_slug}", options.projectSlug))
  ].join("\n");
}

function renderGenericPrompt(service: ServiceRecord): string {
  return [
    `Service: ${service.name}`,
    `Category: ${service.category}`,
    `Homepage: ${service.url ?? "unknown"}`,
    `Description: ${service.description ?? "No description provided."}`,
    "",
    "Find API keys, project settings, endpoints, database URLs, tokens, or connection strings if the service supports them.",
    "If login, CAPTCHA, email verification, or 2FA is required, pause and ask the user to complete it manually.",
    "Do not click Billing, Upgrade, Payment, Subscribe, Add payment method, or enable paid features.",
    "Do not invent unknown values.",
    "Only output KEY=VALUE lines, or state that no configuration values were found."
  ].join("\n");
}
