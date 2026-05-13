import { describe, expect, it } from "vitest";

import { BaipiaoError } from "./index.js";

describe("BaipiaoError", () => {
  it("stores recoverable metadata while masking secret-like details", () => {
    const error = new BaipiaoError("SECRET_SAVE_FAILED", "Save failed", {
      recoverable: false,
      details: {
        message: "provider returned gsk_abcdefghijklmnopqrstuvwxyz1234",
        nested: {
          token: "sk-or-v1-abcdefghijklmnopqrstuvwxyz1234"
        },
        parsedEntry: {
          key: "CUSTOM_API_KEY",
          value: "plain-value-without-known-prefix"
        }
      }
    });

    expect(error.code).toBe("SECRET_SAVE_FAILED");
    expect(error.recoverable).toBe(false);
    expect(JSON.stringify(error.details)).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(JSON.stringify(error.details)).not.toContain("plain-value-without-known-prefix");
    expect(JSON.stringify(error.details)).toContain("gsk_");
    expect(JSON.stringify(error.details)).toContain("sk-o");
  });
});
