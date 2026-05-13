import { describe, expect, it } from "vitest";

import { renderStatusView } from "./status.js";

describe("status renderer", () => {
  it("renders grouped service status, vault summary, and quick actions without the full logo", () => {
    const output = renderStatusView({
      projectName: "Demo Project",
      aiServices: [
        { name: "Groq", state: "tested", testState: "tested" }
      ],
      backendServices: [
        { name: "Supabase", state: "prompt_generated", testState: "not_tested" }
      ],
      vaultKeyCount: 1,
      quickActions: [
        "baipiao test groq",
        "baipiao vault list",
        "baipiao env generate"
      ]
    });

    expect(output).toContain("$ baipiao status");
    expect(output).toContain("AI Services");
    expect(output).toContain("Backend Services");
    expect(output).toContain("Vault");
    expect(output).toContain("1 keys stored");
    expect(output).toContain("$ baipiao test groq");
    expect(output).not.toContain("BAIPIAO");
  });
});
