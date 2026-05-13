import type { ServiceState } from "baipiao-core";

export type SetupSavedEntryViewModel = {
  key: string;
  maskedValue: string;
  status: "stored" | "missing" | "invalid" | "untested";
};

export type SetupViewModel = {
  command: string;
  serviceName: string;
  state: ServiceState;
  savedEntries: SetupSavedEntryViewModel[];
  testStatus: "passed" | "failed" | "skipped";
  envLocalUpdated: boolean;
  envWarnings?: string[];
};

export function renderSetupView(viewModel: SetupViewModel): string {
  return [
    `$ ${viewModel.command}`,
    "",
    viewModel.serviceName,
    "Prompt copied",
    viewModel.savedEntries.length > 0 ? "Agent output parsed" : "Waiting for Agent output",
    "",
    "Progress",
    "  ✓ format valid",
    "  ✓ saved to vault",
    `  ${viewModel.envLocalUpdated ? "✓" : "!"} added to .env.local`,
    `  ${viewModel.testStatus === "failed" ? "!" : "✓"} test`,
    "",
    "Vault Status",
    ...renderVaultRows(viewModel.savedEntries),
    ...(viewModel.envWarnings?.length
      ? ["", ...viewModel.envWarnings]
      : []),
    "",
    `State: ${viewModel.state}`,
    ...viewModel.savedEntries.map((entry) => `${entry.key}=${entry.maskedValue}`),
    ...viewModel.savedEntries.map((entry) => `Saved to Vault: ${entry.key}`),
    `Test: ${viewModel.testStatus}`
  ].join("\n");
}

function renderVaultRows(entries: SetupSavedEntryViewModel[]): string[] {
  if (entries.length === 0) {
    return ["  - no entries saved"];
  }

  return entries.map((entry) => `  - ${entry.key}  ${entry.status}  ${entry.maskedValue}`);
}
