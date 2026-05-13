import type { ServiceFreeTierStatus } from "baipiao-core";
import type { TerminalRenderOptions } from "../terminal/types.js";

export type SearchResultViewModel = {
  name: string;
  freeTierStatus: ServiceFreeTierStatus;
};

export type SearchViewModel = {
  query: string;
  categoryLabel: string;
  detectedLanguage: string;
  results: SearchResultViewModel[];
  quickFilters: string[];
};

export function formatFreeTierBadge(status: ServiceFreeTierStatus): string {
  switch (status) {
    case "free_tier":
      return "Free Tier";
    case "limited_free":
      return "Limited Free";
    case "paid":
      return "Paid";
    case "unknown":
      return "Unknown";
  }
}

export function renderSearchView(viewModel: SearchViewModel, _options: TerminalRenderOptions): string {
  const rows = viewModel.results.map((result, index) => {
    const number = `${index + 1}.`;
    return `${number} ${result.name.padEnd(24, " ")} ${formatFreeTierBadge(result.freeTierStatus)}`;
  });

  return [
    `$ baipiao search ${viewModel.query}`,
    `Detected language: ${viewModel.detectedLanguage}`,
    `Found ${viewModel.results.length} free ${viewModel.categoryLabel} services:`,
    "",
    ...rows,
    "",
    "Quick filters",
    ...viewModel.quickFilters.map((filter) => `baipiao search ${filter}`)
  ].join("\n");
}
