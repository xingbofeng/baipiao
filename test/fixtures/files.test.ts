import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadServiceConfigs, parseAgentOutput } from "baipiao-core";

const FIXTURE_ROOT = join(process.cwd(), "test", "fixtures", "files");

const requiredFixtures = [
  "service-configs/example-llm.yaml",
  "agent-outputs/groq-success.md",
  "env/.env.local",
  "env/.env.example",
  "mcp-responses/generate-setup-prompt.success.json",
  "mcp-responses/vault-list.success.json",
  "error-outputs/cli-error.json",
  "error-outputs/mcp-error.json",
  "masked-outputs/setup-archive.md",
  "masked-outputs/terminal-output.txt"
] as const;

describe("shared test fixtures", () => {
  it("keeps deterministic fixtures for service configs, Agent output, env, MCP, errors, and masked outputs", async () => {
    for (const relativePath of requiredFixtures) {
      const content = await readFixture(relativePath);
      expect(content.trim(), relativePath).not.toBe("");
      expect(content, relativePath).not.toMatch(secretShapePattern);
      expect(content, relativePath).not.toMatch(localPathPattern);
    }
  });

  it("validates the service config fixture against the runtime schema", async () => {
    const [service] = await loadServiceConfigs(join(FIXTURE_ROOT, "service-configs"));
    if (!service?.config?.env?.[0] || !service.config.test) {
      throw new Error("Expected service config fixture to include env and test specs.");
    }

    expect(service.id).toBe("fixture-llm");
    expect(service.capability).toEqual(["prompt", "config", "test"]);
    expect(service.config.env[0].key).toBe("FIXTURE_LLM_API_KEY");
    expect(service.config.env[0].secret).toBe(true);
    expect(service.config.env[0].required).toBe(true);
    expect(service.config.test.type).toBe("openai_compatible_chat");
  });

  it("keeps Agent output fixtures parseable without embedding production-looking secrets", async () => {
    const output = await readFixture("agent-outputs/groq-success.md");
    const parsed = parseAgentOutput(output);

    expect(parsed.entries).toEqual([
      { key: "GROQ_API_KEY", value: "fixture-value-not-real", source: "key_value" },
      { key: "R2_BUCKET_NAME", value: "fixture-bucket", source: "key_value" }
    ]);
    expect(parsed.warnings).toEqual([]);
  });

  it("keeps env fixtures aligned while leaving example values empty", async () => {
    const envLocal = await readFixture("env/.env.local");
    const envExample = await readFixture("env/.env.example");

    expect(envLocal).toContain("GROQ_API_KEY=fixture-value-not-real");
    expect(envLocal).toContain("R2_BUCKET_NAME=fixture-bucket");
    expect(envExample).toContain("GROQ_API_KEY=");
    expect(envExample).toContain("R2_BUCKET_NAME=");
    expect(envExample).not.toContain("fixture-value-not-real");
    expect(envExample).not.toContain("fixture-bucket");
  });

  it("keeps MCP response fixtures protocol-shaped and secret-safe", async () => {
    const promptResponse = JSON.parse(await readFixture("mcp-responses/generate-setup-prompt.success.json")) as {
      jsonrpc: string;
      id: string;
      result: {
        tool: string;
        output: {
          serviceId: string;
          mode: string;
          prompt: string;
        };
      };
    };
    const vaultResponse = JSON.parse(await readFixture("mcp-responses/vault-list.success.json")) as {
      jsonrpc: string;
      id: string;
      result: {
        output: {
          entries: Array<Record<string, unknown>>;
        };
      };
    };

    expect(promptResponse).toMatchObject({
      jsonrpc: "2.0",
      id: "fixture-prompt",
      result: {
        tool: "generate_setup_prompt",
        output: {
          serviceId: "groq",
          mode: "structured"
        }
      }
    });
    expect(promptResponse.result.output.prompt).toContain("GROQ_API_KEY=...");
    expect(vaultResponse.result.output.entries[0]).toHaveProperty("maskedValue");
    expect(vaultResponse.result.output.entries[0]).not.toHaveProperty("value");
  });

  it("keeps error and masked output fixtures sanitized", async () => {
    const cliError = JSON.parse(await readFixture("error-outputs/cli-error.json")) as {
      code: string;
      message: string;
      details?: unknown;
    };
    const mcpError = JSON.parse(await readFixture("error-outputs/mcp-error.json")) as {
      error: {
        code: string;
        data?: unknown;
      };
    };
    const archive = await readFixture("masked-outputs/setup-archive.md");
    const terminal = await readFixture("masked-outputs/terminal-output.txt");

    expect(cliError.code).toBe("SECRET_VALIDATION_FAILED");
    expect(JSON.stringify(cliError.details)).not.toMatch(secretShapePattern);
    expect(mcpError.error.code).toBe("MCP_TOOL_FAILED");
    expect(JSON.stringify(mcpError.error.data)).not.toMatch(/stack|\/Users\//);
    expect(archive).toContain("GROQ_API_KEY=********");
    expect(archive).not.toContain("fixture-value-not-real");
    expect(terminal).toContain("GROQ_API_KEY");
    expect(terminal).not.toContain("fixture-value-not-real");
  });
});

async function readFixture(relativePath: string): Promise<string> {
  return readFile(join(FIXTURE_ROOT, relativePath), "utf8");
}

const secretShapePattern =
  /gsk_[A-Za-z0-9_]{8,}|sk-or-v1-[A-Za-z0-9_-]{8,}|AKIA[A-Za-z0-9]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|BEGIN PRIVATE KEY/i;

const localPathPattern = /\/Users\/[^/\s]+/;
