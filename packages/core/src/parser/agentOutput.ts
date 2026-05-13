export type ParsedAgentOutputEntry = {
  key: string;
  value: string;
  source: "key_value" | "label";
};

export type ParsedAgentOutput = {
  entries: ParsedAgentOutputEntry[];
  warnings: string[];
};

const KEY_VALUE_PATTERN = /^\s*([A-Z][A-Z0-9_]{1,80})\s*=\s*(.+?)\s*$/;
const LABEL_PATTERN = /^\s*([A-Za-z][A-Za-z0-9 _/-]{1,40})\s*:\s*(.+?)\s*$/;

export function parseAgentOutput(output: string): ParsedAgentOutput {
  const entries: ParsedAgentOutputEntry[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let inFence = false;

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }

    const keyValue = KEY_VALUE_PATTERN.exec(line);
    if (keyValue) {
      addEntry(entries, warnings, seen, {
        key: keyValue[1] ?? "",
        value: unquote(keyValue[2] ?? ""),
        source: "key_value"
      });
      continue;
    }

    const label = LABEL_PATTERN.exec(line);
    if (label && isSupportedLabel(label[1] ?? "")) {
      addEntry(entries, warnings, seen, {
        key: labelToKey(label[1] ?? ""),
        value: unquote(label[2] ?? ""),
        source: "label"
      });
      continue;
    }

    if (inFence) {
      warnings.push(`Ignored fenced line: ${line}`);
    }
  }

  return { entries, warnings };
}

function addEntry(
  entries: ParsedAgentOutputEntry[],
  warnings: string[],
  seen: Set<string>,
  entry: ParsedAgentOutputEntry
): void {
  if (seen.has(entry.key)) {
    warnings.push(`Duplicate key ignored: ${entry.key}`);
    return;
  }

  seen.add(entry.key);
  entries.push(entry);
}

function isSupportedLabel(label: string): boolean {
  return /^(api key|endpoint|project id|database url|bucket name)$/i.test(label.trim());
}

function labelToKey(label: string): string {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = /^(['"])(.*)\1$/.exec(trimmed);
  return quoted?.[2] ?? trimmed;
}
