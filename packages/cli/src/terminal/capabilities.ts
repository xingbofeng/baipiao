import { shouldUseCompactOutput, type TerminalRenderOptions } from "./types.js";

export type TerminalCapabilityInput = {
  env?: Record<string, string | undefined>;
  tty?: boolean;
  width?: number;
};

export type TerminalCapabilities = TerminalRenderOptions & {
  compact: boolean;
  ci: boolean;
};

export function detectTerminalCapabilities(input: TerminalCapabilityInput = {}): TerminalCapabilities {
  const env = input.env ?? process.env;
  const tty = input.tty ?? Boolean(process.stdout.isTTY);
  const width = input.width ?? process.stdout.columns ?? 80;
  const ci = isEnabled(env.CI);
  const color = tty && !ci && env.NO_COLOR === undefined;
  const renderOptions = { color, tty, width };

  return {
    ...renderOptions,
    compact: shouldUseCompactOutput(renderOptions),
    ci
  };
}

function isEnabled(value: string | undefined): boolean {
  return value !== undefined && value !== "" && value !== "0" && value.toLowerCase() !== "false";
}
