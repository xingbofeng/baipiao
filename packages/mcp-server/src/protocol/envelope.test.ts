import { describe, expect, it } from "vitest";

import { MemoryVaultService } from "baipiao-core";
import { createMcpToolHandlers } from "../tools/handlers.js";
import { forbiddenMcpToolNames } from "../tools/index.js";
import { handleJsonRpcRequest } from "./envelope.js";

describe("MCP JSON-RPC envelope", () => {
  it("handles MCP initialize handshake", async () => {
    const response = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "0.0.0"
        }
      }
    }, createMcpToolHandlers({ vault: new MemoryVaultService() }));

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "baipiao-mcp"
        }
      }
    });
  });

  it("ignores initialized notifications without emitting JSON-RPC errors", async () => {
    await expect(handleJsonRpcRequest({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    }, createMcpToolHandlers({ vault: new MemoryVaultService() }))).resolves.toBeUndefined();
  });

  it("returns a JSON-RPC success envelope for tool calls without secret values", async () => {
    const response = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "generate_setup_prompt",
        arguments: { serviceId: "groq", projectSlug: "mcp-app" }
      }
    }, createMcpToolHandlers({ vault: new MemoryVaultService() }));

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 7,
      result: {
        tool: "generate_setup_prompt",
        output: {
          serviceId: "groq",
          mode: "structured"
        }
      }
    });
    expect(JSON.stringify(response)).not.toContain("gsk_abcdefghijklmnopqrstuvwxyz1234");
  });

  it("lists allowlisted tools with concrete input schemas", async () => {
    const response = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: "tools",
      method: "tools/list",
      params: {}
    }, createMcpToolHandlers({ vault: new MemoryVaultService() }));

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe("tools");
    if (!("result" in response)) {
      throw new Error("Expected tools/list success response.");
    }
    const result = response.result as {
      tools: Array<{
        name: string;
        inputSchema: {
          type: string;
          required?: string[];
          properties?: Record<string, unknown>;
        };
      }>;
    };
    const listFreeCatalog = result.tools.find((tool) => tool.name === "list_free_catalog_candidates");
    const applyTranslations = result.tools.find((tool) => tool.name === "apply_free_catalog_translations");
    const translationBatch = result.tools.find((tool) => tool.name === "get_free_catalog_translation_batch");
    const generatePrompt = result.tools.find((tool) => tool.name === "generate_setup_prompt");
    const vaultSet = result.tools.find((tool) => tool.name === "vault_set");

    expect(listFreeCatalog?.inputSchema.properties).toMatchObject({
      query: { type: "string" },
      locale: { type: "string", enum: ["en", "zh-CN", "ja", "ko", "fr", "es"] }
    });
    expect(result.tools.find((tool) => tool.name === "list_services")?.inputSchema.properties).toMatchObject({
      query: { type: "string" },
      systemLocale: { type: "string" }
    });
    expect(applyTranslations?.inputSchema.required).toEqual(["locale", "translations"]);
    expect(translationBatch?.inputSchema.required).toEqual(["locale"]);
    expect(translationBatch?.inputSchema.properties).toMatchObject({
      locale: { type: "string", enum: ["zh-CN", "ja", "ko", "fr", "es"] },
      limit: { type: "number" }
    });
    expect(generatePrompt?.inputSchema.type).toBe("object");
    expect(generatePrompt?.inputSchema.required).toEqual(["serviceId"]);
    expect(generatePrompt?.inputSchema.properties).toMatchObject({
      serviceId: { type: "string" },
      projectSlug: { type: "string" }
    });
    expect(vaultSet?.inputSchema.required).toEqual(["key", "value"]);
  });

  it("returns a JSON-RPC error envelope for invalid requests", async () => {
    const response = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: "bad",
      method: "tools/call"
    }, createMcpToolHandlers({ vault: new MemoryVaultService() }));

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: "bad",
      error: {
        code: "MCP_PROTOCOL_INVALID_REQUEST"
      }
    });
    expect(JSON.stringify(response)).not.toMatch(/stack|Users\/counter|abcdefghijklmnopqrstuvwxyz1234/);
  });

  it("handles tools/list without params (params is optional per MCP spec)", async () => {
    const response = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: "list-without-params",
      method: "tools/list"
    }, createMcpToolHandlers({ vault: new MemoryVaultService() }));

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: "list-without-params",
      result: {
        tools: expect.any(Array)
      }
    });
  });

  it("handles ping without params (params is optional per MCP spec)", async () => {
    const response = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: "ping-without-params",
      method: "ping"
    }, createMcpToolHandlers({ vault: new MemoryVaultService() }));

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: "ping-without-params",
      result: {}
    });
  });

  it("validates tool arguments against registered input schemas", async () => {
    const handlers = createMcpToolHandlers({ vault: new MemoryVaultService() });

    await expect(handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: "missing-service",
      method: "tools/call",
      params: {
        name: "generate_setup_prompt",
        arguments: {}
      }
    }, handlers)).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: "missing-service",
      error: {
        code: "MCP_PROTOCOL_INVALID_REQUEST",
        message: "Invalid MCP tool arguments: serviceId is required."
      }
    });

    await expect(handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: "bad-capability",
      method: "tools/call",
      params: {
        name: "list_services",
        arguments: { capability: "oauth" }
      }
    }, handlers)).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: "bad-capability",
      error: {
        code: "MCP_PROTOCOL_INVALID_REQUEST",
        message: "Invalid MCP tool arguments: capability must be one of prompt, config, test."
      }
    });
  });

  it("rejects forbidden and unknown tools through stable error responses", async () => {
    const handlers = createMcpToolHandlers({ vault: new MemoryVaultService() });

    for (let index = 0; index < forbiddenMcpToolNames.length; index++) {
      const toolName = forbiddenMcpToolNames[index];
      await expect(handleJsonRpcRequest({
        jsonrpc: "2.0",
        id: index + 1,
        method: "tools/call",
        params: { name: toolName }
      }, handlers)).resolves.toMatchObject({
        jsonrpc: "2.0",
        id: index + 1,
        error: {
          code: "MCP_TOOL_FAILED",
          data: {
            baipiaoCode: "MCP_TOOL_FAILED",
            recoverable: true
          },
          message: `Forbidden MCP tool is not available: ${toolName}`
        }
      });
    }
  });

  it("maps unknown MCP tool calls to MCP_TOOL_NOT_FOUND", async () => {
    await expect(handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: "missing-tool",
      method: "tools/call",
      params: { name: "does_not_exist" }
    }, createMcpToolHandlers({ vault: new MemoryVaultService() }))).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: "missing-tool",
      error: {
        code: "MCP_TOOL_NOT_FOUND",
        message: "MCP tool not found: does_not_exist"
      }
    });
  });
});
