import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getServiceByIdOrSlug, loadServiceConfigs, searchServices } from "./configs.js";

describe("registry service configs", () => {
  it("loads committed service configs when invoked outside the repository cwd", async () => {
    const originalCwd = process.cwd();
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-outside-cwd-"));

    try {
      process.chdir(cwd);
      const services = await loadServiceConfigs();

      expect(services.map((service) => service.id)).toContain("groq");
    } finally {
      process.chdir(originalCwd);
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("loads the PRD first-party service configs with exact Groq contract fields", async () => {
    const services = await loadServiceConfigs();
    const groq = getServiceByIdOrSlug(services, "groq");

    expect(groq).toMatchObject({
      id: "groq",
      name: "Groq",
      slug: "groq",
      category: "llm",
      url: "https://groq.com",
      capability: ["prompt", "config", "test"],
      config: {
        urls: {
          homepage: "https://groq.com",
          console: "https://console.groq.com",
          apiKeys: "https://console.groq.com/keys",
          docs: "https://console.groq.com/docs"
        },
        test: {
          type: "openai_compatible_chat",
          baseUrl: "https://api.groq.com/openai/v1",
          envKey: "GROQ_API_KEY",
          modelHint: "llama-3.1-8b-instant"
        }
      }
    });
    expect(groq?.config?.env).toContainEqual(expect.objectContaining({
      key: "GROQ_API_KEY",
      secret: true,
      required: true,
      pattern: "^gsk_[A-Za-z0-9]+$"
    }));
  });

  it("loads all structured first-party services and keeps Vercel prompt-only", async () => {
    const services = await loadServiceConfigs();
    const byId = new Map(services.map((service) => [service.id, service]));

    expect(byId.get("openrouter")?.config?.test).toMatchObject({
      type: "openai_compatible_chat",
      baseUrl: "https://openrouter.ai/api/v1",
      envKey: "OPENROUTER_API_KEY",
      modelHint: "openrouter/auto"
    });
    expect(byId.get("gemini")?.config?.test).toMatchObject({
      type: "http",
      method: "GET",
      url: "https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}",
      expectedStatus: 200
    });
    expect(byId.get("supabase")?.config?.test).toMatchObject({
      type: "supabase",
      urlEnvKey: "SUPABASE_URL",
      anonKeyEnvKey: "SUPABASE_ANON_KEY"
    });
    expect(byId.get("cloudflare-r2")?.config?.test).toMatchObject({
      type: "s3_compatible",
      endpointEnvKey: "R2_ENDPOINT",
      accessKeyEnvKey: "R2_ACCESS_KEY_ID",
      secretKeyEnvKey: "R2_SECRET_ACCESS_KEY",
      bucketEnvKey: "R2_BUCKET_NAME"
    });
    expect(byId.get("vercel")?.capability).toEqual(["prompt"]);
    expect(byId.get("vercel")?.config?.env).toBeUndefined();
  });

  it("searches by query, category, and capability while every service remains prompt-ready", async () => {
    const services = await loadServiceConfigs();

    expect(services.every((service) => service.capability.includes("prompt"))).toBe(true);
    expect(searchServices(services, { query: "llm" }).map((service) => service.id)).toEqual([
      "groq",
      "openrouter",
      "gemini"
    ]);
    expect(searchServices(services, { category: "object_storage" }).map((service) => service.id)).toEqual([
      "cloudflare-r2"
    ]);
    expect(searchServices(services, { capability: "test" }).map((service) => service.id)).toEqual([
      "groq",
      "openrouter",
      "gemini",
      "supabase",
      "cloudflare-r2"
    ]);
  });

  it("detects localized service search terms and matches the canonical category", async () => {
    const services = await loadServiceConfigs();

    expect(searchServices(services, { query: "数据库" }).map((service) => service.id)).toEqual(["supabase"]);
    expect(searchServices(services, { query: "データベース" }).map((service) => service.id)).toEqual(["supabase"]);
    expect(searchServices(services, { query: "데이터베이스" }).map((service) => service.id)).toEqual(["supabase"]);
    expect(searchServices(services, { query: "base de données" }).map((service) => service.id)).toEqual(["supabase"]);
    expect(searchServices(services, { query: "base de datos" }).map((service) => service.id)).toEqual(["supabase"]);
  });

  it("does not match short localized aliases inside unrelated words", async () => {
    const services = await loadServiceConfigs();

    expect(searchServices(services, { query: "mail" }).map((service) => service.id)).toEqual([]);
  });
});
