import { describe, expect, it } from "vitest";

import { renderSetupView } from "./setup.js";

describe("setup renderer", () => {
  it("renders the design setup panel without revealing secret values or full logo", () => {
    const output = renderSetupView({
      command: "baipiao setup groq",
      serviceName: "Groq",
      state: "tested",
      savedEntries: [
        {
          key: "GROQ_API_KEY",
          maskedValue: "gsk_**************************1234",
          status: "stored"
        }
      ],
      testStatus: "passed",
      envLocalUpdated: true
    });

    expect(output).toContain("$ baipiao setup groq");
    expect(output).toContain("Prompt copied");
    expect(output).toContain("Agent output parsed");
    expect(output).toContain("Vault Status");
    expect(output).toContain("GROQ_API_KEY=gsk_**************************1234");
    expect(output).toContain("✓ added to .env.local");
    expect(output).toContain("Saved to Vault: GROQ_API_KEY");
    expect(output).toContain("Test: passed");
    expect(output).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(output).not.toContain("BAIPIAO");
  });
});
