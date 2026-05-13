import { createAnsiTheme } from "../terminal/theme.js";
import { shouldUseCompactOutput, type TerminalRenderOptions } from "../terminal/types.js";

export const BAIPIAO_WORDMARK = [
  "██████╗  █████╗ ██╗██████╗ ██╗ █████╗  ██████╗",
  "██╔══██╗██╔══██╗██║██╔══██╗██║██╔══██╗██╔═══██╗",
  "██████╔╝███████║██║██████╔╝██║███████║██║   ██║",
  "██╔══██╗██╔══██║██║██╔═══╝ ██║██╔══██║██║   ██║",
  "██████╔╝██║  ██║██║██║     ██║██║  ██║╚██████╔╝",
  "╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝",
  "BAIPIAO"
];

export function renderBrandWordmark(options: TerminalRenderOptions): string {
  if (shouldUseCompactOutput(options)) {
    return "baipiao";
  }

  const theme = createAnsiTheme(options);
  return BAIPIAO_WORDMARK.map((line) => theme.accent(line)).join("\n");
}
