import { describe, expect, it } from "vitest";

import { maskKnownSecretsInText, maskSecretValue, sanitizeSecretDetails } from "./redaction.js";

describe("redaction", () => {
  it("masks known secret tokens and key-named assignments consistently", () => {
    expect(maskSecretValue("gsk_abcdefghijklmnopqrstuvwxyz1234")).toBe("gsk_**************************1234");
    expect(maskSecretValue("short")).toBe("*****");
    expect(maskKnownSecretsInText("CUSTOM_API_KEY=plain-value-without-known-prefix")).toBe(
      `CUSTOM_API_KEY=${maskSecretValue("plain-value-without-known-prefix")}`
    );
    expect(maskKnownSecretsInText("PUBLIC_URL=https://example.com")).toBe("PUBLIC_URL=https://example.com");
  });

  it("uses entry keys to mask plain values in structured details", () => {
    const details = sanitizeSecretDetails({
      message: "provider returned gsk_abcdefghijklmnopqrstuvwxyz1234",
      nested: {
        token: "sk-or-v1-abcdefghijklmnopqrstuvwxyz1234"
      },
      parsedEntry: {
        key: "CUSTOM_API_KEY",
        value: "plain-value-without-known-prefix"
      }
    });

    const serialized = JSON.stringify(details);
    expect(serialized).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(serialized).not.toContain("plain-value-without-known-prefix");
    expect(serialized).toContain("gsk_");
    expect(serialized).toContain("sk-o");
  });
});
