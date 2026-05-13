export type AnsiThemeOptions = {
  color: boolean;
};

export type AnsiTheme = {
  accent: (value: string) => string;
  success: (value: string) => string;
  warning: (value: string) => string;
  muted: (value: string) => string;
};

export function createAnsiTheme(options: AnsiThemeOptions): AnsiTheme {
  return {
    accent: colorize(options.color, "36"),
    success: colorize(options.color, "32"),
    warning: colorize(options.color, "33"),
    muted: colorize(options.color, "2")
  };
}

function colorize(enabled: boolean, code: string): (value: string) => string {
  return (value: string) => enabled ? `\u001B[${code}m${value}\u001B[0m` : value;
}
