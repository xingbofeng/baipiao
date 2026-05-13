import { shouldUseCompactOutput, type TerminalRenderOptions } from "../terminal/types.js";
import { renderBrandWordmark } from "./shared.js";

export type InitViewModel = {
  projectName: string;
  createdFiles: string[];
  nextCommand: string;
};

export function renderInitView(viewModel: InitViewModel, options: TerminalRenderOptions): string {
  if (shouldUseCompactOutput(options)) {
    return [
      "baipiao",
      "Project initialized",
      ...viewModel.createdFiles.map((file) => `Created ${file}`),
      `Next: ${viewModel.nextCommand}`
    ].join("\n");
  }

  return [
    "$ baipiao init",
    "",
    renderBrandWordmark(options),
    "",
    "Let Agent configure free services for you.",
    "",
    "Project initialized",
    ...viewModel.createdFiles.map((file) => `✓ Created ${file}`),
    "",
    `Tip: Run '${viewModel.nextCommand}' to find free services.`
  ].join("\n");
}
