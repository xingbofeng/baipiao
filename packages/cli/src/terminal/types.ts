export type TerminalRenderOptions = {
  color: boolean;
  tty: boolean;
  width: number;
};

export function shouldUseCompactOutput(options: TerminalRenderOptions): boolean {
  return !options.tty || options.width < 80;
}
