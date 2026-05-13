import { describe, expect, it } from "vitest";

import { generateEnvFiles } from "./index.js";

describe("env generator", () => {
  it("writes real values to .env.local and empty placeholders to .env.example", () => {
    const result = generateEnvFiles([
      { key: "GROQ_API_KEY", value: "gsk_live_1234", state: "tested" },
      { key: "SUPABASE_URL", value: "https://demo.supabase.co", state: "configured" }
    ]);

    expect(result.envLocal).toBe([
      "GROQ_API_KEY=gsk_live_1234",
      "SUPABASE_URL=https://demo.supabase.co",
      ""
    ].join("\n"));
    expect(result.envExample).toBe([
      "GROQ_API_KEY=",
      "SUPABASE_URL=",
      ""
    ].join("\n"));
  });

  it("excludes unverified values from .env.local unless explicitly included", () => {
    const entries = [
      { key: "VERCEL_TOKEN", value: "token", state: "configured_unverified" as const }
    ];

    expect(generateEnvFiles(entries).envLocal).toBe("");
    expect(generateEnvFiles(entries, { includeUnverified: true }).envLocal).toBe("VERCEL_TOKEN=token\n");
    expect(generateEnvFiles(entries).warnings).toContain("Skipped unverified env value: VERCEL_TOKEN");
  });

  it("excludes failed values from .env.local", () => {
    const result = generateEnvFiles([
      { key: "GROQ_API_KEY", value: "gsk_live_1234", state: "failed" }
    ]);

    expect(result.envLocal).toBe("");
    expect(result.envExample).toBe("GROQ_API_KEY=\n");
    expect(result.warnings).toContain("Skipped failed env value: GROQ_API_KEY");
  });
});
