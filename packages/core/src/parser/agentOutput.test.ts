import { describe, expect, it } from "vitest";

import { parseAgentOutput } from "./agentOutput.js";

describe("agent output parser", () => {
  it("parses KEY=VALUE lines and masks nothing during parsing", () => {
    const result = parseAgentOutput("GROQ_API_KEY=gsk_live_1234\nR2_BUCKET_NAME=my-bucket");

    expect(result.entries).toEqual([
      { key: "GROQ_API_KEY", value: "gsk_live_1234", source: "key_value" },
      { key: "R2_BUCKET_NAME", value: "my-bucket", source: "key_value" }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses fenced env blocks and colon-labeled values", () => {
    const result = parseAgentOutput([
      "```env",
      "SUPABASE_URL=https://demo.supabase.co",
      "```",
      "API Key: abc123",
      "Project ID: demo-project"
    ].join("\n"));

    expect(result.entries).toEqual([
      { key: "SUPABASE_URL", value: "https://demo.supabase.co", source: "key_value" },
      { key: "API_KEY", value: "abc123", source: "label" },
      { key: "PROJECT_ID", value: "demo-project", source: "label" }
    ]);
  });

  it("reports duplicate keys without dropping the first value", () => {
    const result = parseAgentOutput("GROQ_API_KEY=first\nGROQ_API_KEY=second");

    expect(result.entries).toEqual([
      { key: "GROQ_API_KEY", value: "first", source: "key_value" }
    ]);
    expect(result.warnings).toContain("Duplicate key ignored: GROQ_API_KEY");
  });
});
