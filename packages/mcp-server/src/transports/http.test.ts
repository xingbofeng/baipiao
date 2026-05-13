import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { MemoryVaultService } from "baipiao-core";

import { createMcpToolHandlers } from "../tools/handlers.js";
import { handleHttpMcpPayload } from "./http.js";

let tmpPaths: string[] = [];

describe("MCP HTTP transport", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("serves MCP JSON-RPC requests for tools/list and tools/call", async () => {
    const response = await handleHttpMcpPayload({
      method: "POST",
      url: "/mcp",
      handlers: createMcpToolHandlers({ vault: new MemoryVaultService() }),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "tools/list",
        params: {}
      })
    });

    const payload = JSON.parse(response.body) as {
      jsonrpc: "2.0";
      id: string | number;
      result: { tools: Array<{ name: string }> };
    };

    expect(response.statusCode).toBe(200);
    expect(payload.result.tools.map((tool) => tool.name)).toContain("list_services");
  });

  it("returns JSON-RPC invalid request errors on malformed HTTP payloads", async () => {
    const response = await handleHttpMcpPayload({
      method: "POST",
      url: "/mcp",
      handlers: createMcpToolHandlers({ vault: new MemoryVaultService() }),
      body: "not-json"
    });

    const payload = JSON.parse(response.body) as {
      error: { code: string; message: string };
      id: null;
    };

    expect(response.statusCode).toBe(200);
    expect(payload).toMatchObject({
      id: null,
      error: { code: "MCP_PROTOCOL_INVALID_REQUEST" }
    });
  });

  it("resolves free-for-dev normalized candidates in tool handlers", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-mcp-http-candidate-"));
    tmpPaths.push(cwd);
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, "normalized.json"), `${JSON.stringify({
      schemaVersion: "baipiao.normalized-catalog.v1",
      generatedAt: "2026-05-13T00:00:00.000Z",
      source: {
        id: "free-for-dev",
        name: "free-for-dev",
        url: "https://github.com/ripienaar/free-for-dev",
        rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
        license: "unknown",
        fetchedAt: "2026-05-13T00:00:00.000Z",
        stale: false
      },
      parser: {
        name: "free-for-dev-markdown",
        version: "1"
      },
      stats: {
        categoryCount: 1,
        parsedItemCount: 1,
        skippedItemCount: 0,
        warningCount: 0
      },
      items: [
        {
          id: "free-for-dev:generative-ai:demo-ai",
          name: "Demo AI",
          slug: "demo-ai",
          category: "llm",
          sourceCategory: "Generative AI",
          description: "Demo free AI API.",
          url: "https://example.com",
          capability: ["prompt"],
          freeTierText: "Free tier available with review.",
          freeTierStatus: "free_tier",
          source: {
            id: "free-for-dev",
            url: "https://github.com/ripienaar/free-for-dev",
            rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
            importedAt: "2026-05-13T00:00:00.000Z"
          },
          rawExcerptRef: {
            path: "registry/sources/free-for-dev/raw/README.md",
            lineStart: 1,
            lineEnd: 1
          },
          confidence: "medium",
          reviewStatus: "needs_review",
          warnings: []
        }
      ]
    }, null, 2)}\n`, "utf8");

    const response = await handleHttpMcpPayload({
      method: "POST",
      url: "/mcp",
      handlers: createMcpToolHandlers({ cwd, vault: new MemoryVaultService() }),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "2",
        method: "tools/call",
        params: {
          name: "generate_setup_prompt",
          arguments: {
            serviceId: "free-for-dev:generative-ai:demo-ai"
          }
        }
      })
    });

    const payload = JSON.parse(response.body) as {
      result: {
        output: {
          mode: string;
          serviceId: string;
          prompt: string;
        };
      };
    };

    expect(response.statusCode).toBe(200);
    expect(payload.result.output.serviceId).toBe("free-for-dev:generative-ai:demo-ai");
    expect(payload.result.output.mode).toBe("generic");
    expect(payload.result.output.prompt).toContain("Demo AI");
  });
});
