const SECRET_ASSIGNMENT_PATTERN =
  /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL|ACCESS_KEY|SERVICE_ROLE)[A-Z0-9_]*)\s*([=:])\s*("[^"]*"|'[^']*'|[^\s,;]+)/g;

export function maskSecretValue(value: string): string {
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}${"*".repeat(value.length - 8)}${value.slice(-4)}`;
}

export function maskKnownSecretsInText(text: string): string {
  return maskKeyNamedSecretAssignments(text)
    .replace(/gsk_[A-Za-z0-9]+/g, (value) => maskSecretValue(value))
    .replace(/sk-or-v1-[A-Za-z0-9_-]+/g, (value) => maskSecretValue(value))
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, (value) => maskSecretValue(value))
    .replace(/AKIA[A-Za-z0-9]+/g, (value) => maskSecretValue(value));
}

export function sanitizeSecretDetails(details: unknown, contextKey?: string): unknown {
  if (typeof details === "string") {
    const maskedKnownSecrets = maskKnownSecretsInText(details);
    if (contextKey && isSecretContextKey(contextKey) && maskedKnownSecrets === details) {
      return maskSecretValue(details);
    }
    return maskedKnownSecrets;
  }

  if (Array.isArray(details)) {
    return details.map((item) => sanitizeSecretDetails(item, contextKey));
  }

  if (typeof details === "object" && details !== null) {
    const record = details as Record<string, unknown>;
    const entryKey = typeof record.key === "string" ? record.key : undefined;
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [
        key,
        sanitizeSecretDetails(value, key === "value" && entryKey ? entryKey : key)
      ])
    );
  }

  return details;
}

function maskKeyNamedSecretAssignments(text: string): string {
  return text.replace(
    SECRET_ASSIGNMENT_PATTERN,
    (_match, key: string, separator: string, rawValue: string) => {
      const quote = rawValue.startsWith("\"") || rawValue.startsWith("'") ? rawValue[0] : "";
      const value = quote ? rawValue.slice(1, -1) : rawValue;
      return `${key}${separator}${quote}${maskSecretValue(value)}${quote}`;
    }
  );
}

function isSecretContextKey(key: string): boolean {
  return /KEY|TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL|ACCESS_KEY|SERVICE_ROLE/i.test(key);
}
