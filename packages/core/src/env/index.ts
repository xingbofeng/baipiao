export type EnvGenerationState = "tested" | "configured" | "configured_unverified" | "failed";

export type EnvGenerationEntry = {
  key: string;
  value: string;
  state: EnvGenerationState;
};

export type GenerateEnvFilesOptions = {
  includeUnverified?: boolean;
};

export type GeneratedEnvFiles = {
  envLocal: string;
  envExample: string;
  warnings: string[];
};

export function generateEnvFiles(
  entries: EnvGenerationEntry[],
  options: GenerateEnvFilesOptions = {}
): GeneratedEnvFiles {
  const warnings: string[] = [];
  const envLocalLines: string[] = [];
  const envExampleLines: string[] = [];

  for (const entry of entries) {
    envExampleLines.push(`${entry.key}=`);

    if (entry.state === "configured_unverified" && !options.includeUnverified) {
      warnings.push(`Skipped unverified env value: ${entry.key}`);
      continue;
    }
    if (entry.state === "failed") {
      warnings.push(`Skipped failed env value: ${entry.key}`);
      continue;
    }

    envLocalLines.push(`${entry.key}=${entry.value}`);
  }

  return {
    envLocal: envLocalLines.length > 0 ? `${envLocalLines.join("\n")}\n` : "",
    envExample: envExampleLines.length > 0 ? `${envExampleLines.join("\n")}\n` : "",
    warnings
  };
}
