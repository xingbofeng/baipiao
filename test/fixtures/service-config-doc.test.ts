import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("service config developer docs", () => {
  it("documents catalog, config, env, prompt, and test spec requirements", async () => {
    const doc = await readFile("docs/ADDING_SERVICE_CONFIG.md", "utf8");

    expect(doc).toContain("# Adding Service Configs");
    expect(doc).toContain("registry/configs/<service>.yaml");
    expect(doc).toContain("registry/catalog");
    expect(doc).toContain("env:");
    expect(doc).toContain("prompt:");
    expect(doc).toContain("test:");
    expect(doc).toContain("openai_compatible_chat");
    expect(doc).toContain("http");
    expect(doc).toContain("supabase");
    expect(doc).toContain("s3_compatible");
    expect(doc).toContain("manual");
    expect(doc).toContain("pnpm catalog:build");
    expect(doc).toContain("pnpm catalog:validate");
    expect(doc).toContain("Do not commit secret values");
  });
});
