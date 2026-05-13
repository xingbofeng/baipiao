import { describe, expect, it } from "vitest";

import { loadServiceConfigs } from "../registry/configs.js";
import { MemoryVaultService } from "../vault/index.js";
import { processAgentOutputForService } from "./workflow.js";

describe("setup workflow", () => {
  it("validates, saves, generates env, tests, and masks structured service output", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");
    const vault = new MemoryVaultService();

    const result = await processAgentOutputForService({
      service: groq!,
      text: "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234",
      vault,
      testConnection: () => Promise.resolve({ status: "passed", ok: true, message: "ok" })
    });

    expect(result.state).toBe("tested");
    expect(result.saved).toEqual([
      expect.objectContaining({
        key: "GROQ_API_KEY",
        maskedValue: "gsk_**************************1234",
        valid: true,
        secret: true
      })
    ]);
    expect(result.failed).toEqual([]);
    expect(result.env.envLocal).toBe("GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234\n");
    expect(result.env.envExample).toBe("GROQ_API_KEY=\n");
    expect(result.archiveMarkdown).toContain("GROQ_API_KEY=gsk_**************************1234");
    expect(result.archiveMarkdown).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    await expect(vault.get("GROQ_API_KEY")).resolves.toBe("gsk_abcdefghijklmnopqrstuvwxyz1234");
  });

  it("rejects invalid structured values without saving partial entries", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");
    const vault = new MemoryVaultService();

    const result = await processAgentOutputForService({
      service: groq!,
      text: "GROQ_API_KEY=bad",
      vault,
      testConnection: () => Promise.resolve({ status: "passed", ok: true, message: "should not run" })
    });

    expect(result.state).toBe("failed");
    expect(result.saved).toEqual([]);
    expect(result.failed).toEqual([
      expect.objectContaining({
        key: "GROQ_API_KEY",
        code: "SECRET_VALIDATION_FAILED"
      })
    ]);
    await expect(vault.get("GROQ_API_KEY")).rejects.toMatchObject({
      code: "VAULT_ENTRY_NOT_FOUND"
    });
  });

  it("reports parse failures when Agent output contains no configuration entries", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");
    const vault = new MemoryVaultService();

    const result = await processAgentOutputForService({
      service: groq!,
      text: "I could not find anything.",
      vault
    });

    expect(result.state).toBe("failed");
    expect(result.saved).toEqual([]);
    expect(result.failed).toEqual([
      expect.objectContaining({
        key: "agent_output",
        code: "AGENT_OUTPUT_PARSE_FAILED"
      })
    ]);
  });

  it("warns about unknown structured keys while saving valid required entries", async () => {
    const services = await loadServiceConfigs();
    const groq = services.find((service) => service.id === "groq");
    const vault = new MemoryVaultService();

    const result = await processAgentOutputForService({
      service: groq!,
      text: [
        "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234",
        "EXTRA_TOKEN=should_not_be_saved"
      ].join("\n"),
      vault,
      testConnection: () => Promise.resolve({ status: "passed", ok: true, message: "ok" })
    });

    expect(result.state).toBe("tested");
    expect(result.saved.map((entry) => entry.key)).toEqual(["GROQ_API_KEY"]);
    expect(result.warnings).toContain("Unknown key ignored: EXTRA_TOKEN");
    await expect(vault.has("EXTRA_TOKEN")).resolves.toBe(false);
  });

  it("saves prompt-only service output as configured_unverified and skips tests", async () => {
    const services = await loadServiceConfigs();
    const vercel = services.find((service) => service.id === "vercel");
    const vault = new MemoryVaultService();

    const result = await processAgentOutputForService({
      service: vercel!,
      text: "API Key: vercel_token_123\nEndpoint: https://vercel.com/dashboard",
      vault
    });

    expect(result.state).toBe("configured_unverified");
    expect(result.saved.map((entry) => entry.key)).toEqual(["VERCEL_API_KEY", "VERCEL_ENDPOINT"]);
    expect(result.testResult).toMatchObject({ status: "skipped", ok: true });
    expect(result.env.envLocal).toBe("");
    expect(result.env.envExample).toBe("VERCEL_API_KEY=\nVERCEL_ENDPOINT=\n");
  });
});
