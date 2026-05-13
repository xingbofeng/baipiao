import type { ServiceState } from "baipiao-core";

export type StatusServiceRow = {
  name: string;
  state: ServiceState;
  testState: "tested" | "not_tested" | "failed";
};

export type StatusViewModel = {
  projectName: string;
  aiServices: StatusServiceRow[];
  backendServices: StatusServiceRow[];
  vaultKeyCount: number;
  quickActions: string[];
};

export function renderStatusView(viewModel: StatusViewModel): string {
  return [
    "$ baipiao status",
    "",
    "Project",
    `  ${viewModel.projectName}`,
    "",
    "AI Services",
    ...renderRows(viewModel.aiServices),
    "",
    "Backend Services",
    ...renderRows(viewModel.backendServices),
    "",
    "Vault",
    `  ${viewModel.vaultKeyCount} keys stored`,
    "",
    "Quick Actions",
    ...viewModel.quickActions.map((action) => `  $ ${action}`)
  ].join("\n");
}

function renderRows(rows: StatusServiceRow[]): string[] {
  if (rows.length === 0) {
    return ["  - none"];
  }

  return rows.map((row) => `  - ${row.name}  ${row.state}  ${row.testState}`);
}
