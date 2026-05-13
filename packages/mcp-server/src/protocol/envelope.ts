import { BaipiaoError, maskKnownSecretsInText } from "baipiao-core";

import {
  forbiddenMcpToolNames,
  mcpToolDefinitions,
  mcpToolNames,
  type createMcpToolHandlers
} from "../tools/index.js";

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
};

export type JsonRpcSuccessResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
};

export type JsonRpcErrorResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: string;
    message: string;
    data?: unknown;
  };
};

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

type McpToolHandlers = ReturnType<typeof createMcpToolHandlers>;
type CallableMcpTool = (input: Record<string, unknown>) => Promise<unknown>;

export function handleJsonRpcRequest(input: JsonRpcRequest, handlers: McpToolHandlers): Promise<JsonRpcResponse>;
export function handleJsonRpcRequest(input: unknown, handlers: McpToolHandlers): Promise<JsonRpcResponse | undefined>;
export async function handleJsonRpcRequest(input: unknown, handlers: McpToolHandlers): Promise<JsonRpcResponse | undefined> {
  const id = readRequestId(input);
  if (
    !isObject(input)
    || input.jsonrpc !== "2.0"
    || typeof input.method !== "string"
  ) {
    return errorResponse(id, "MCP_PROTOCOL_INVALID_REQUEST", "Invalid JSON-RPC request envelope.");
  }

  if (!("id" in input)) {
    return handleJsonRpcNotification(input.method);
  }

  if (input.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: readProtocolVersion(input.params),
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "baipiao-mcp",
          version: "1.1.0"
        }
      }
    };
  }

  if (input.method === "ping") {
    return {
      jsonrpc: "2.0",
      id,
      result: {}
    };
  }

  if (input.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: mcpToolDefinitions
      }
    };
  }

  if (!isObject(input.params)) {
    return errorResponse(id, "MCP_PROTOCOL_INVALID_REQUEST", "Invalid JSON-RPC request envelope.");
  }

  if (input.method !== "tools/call") {
    return errorResponse(id, "MCP_PROTOCOL_INVALID_REQUEST", "Invalid MCP tool request.");
  }

  const toolName = input.params.name;
  const toolArguments = input.params.arguments;
  if (typeof toolName !== "string" || (toolArguments !== undefined && !isObject(toolArguments))) {
    return errorResponse(id, "MCP_PROTOCOL_INVALID_REQUEST", "MCP tool call requires name and object arguments.");
  }

  try {
    if (forbiddenMcpToolNames.includes(toolName as (typeof forbiddenMcpToolNames)[number])) {
      await handlers.callForbiddenTool(toolName);
    }

    const tool = (handlers as Record<string, unknown>)[toolName];
    if (typeof tool !== "function" || !mcpToolNames.includes(toolName as (typeof mcpToolNames)[number])) {
      return errorResponse(id, "MCP_TOOL_NOT_FOUND", `MCP tool not found: ${toolName}`);
    }
    const toolDefinition = mcpToolDefinitions.find((definition) => definition.name === toolName);
    const validationError = validateToolArguments(toolArguments ?? {}, toolDefinition?.inputSchema);
    if (validationError) {
      return errorResponse(id, "MCP_PROTOCOL_INVALID_REQUEST", `Invalid MCP tool arguments: ${validationError}`);
    }

    const output = await (tool as CallableMcpTool)(toolArguments ?? {});
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tool: toolName,
        output,
        content: [{
          type: "text",
          text: JSON.stringify(output)
        }]
      }
    };
  } catch (error) {
    return mapErrorResponse(id, error);
  }
}

function handleJsonRpcNotification(method: string): undefined {
  if (method === "notifications/initialized" || method.startsWith("notifications/")) {
    return undefined;
  }
  return undefined;
}

function readProtocolVersion(params: unknown): string {
  if (isObject(params) && typeof params.protocolVersion === "string") {
    return params.protocolVersion;
  }
  return "2024-11-05";
}

function readRequestId(input: unknown): string | number | null {
  if (isObject(input) && (typeof input.id === "string" || typeof input.id === "number")) {
    return input.id;
  }
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapErrorResponse(id: string | number | null, error: unknown): JsonRpcErrorResponse {
  if (error instanceof BaipiaoError) {
    return errorResponse(id, error.code, maskKnownSecretsInText(error.message), {
      baipiaoCode: error.code,
      recoverable: error.recoverable,
      ...(error.details === undefined ? {} : { details: sanitizeDetails(error.details) })
    });
  }

  return errorResponse(id, "MCP_TOOL_FAILED", "MCP tool failed.");
}

function errorResponse(
  id: string | number | null,
  code: string,
  message: string,
  data?: unknown
): JsonRpcErrorResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message: maskKnownSecretsInText(message),
      ...(data === undefined ? {} : { data })
    }
  };
}

function sanitizeDetails(details: unknown): unknown {
  if (typeof details === "string") {
    return maskKnownSecretsInText(details);
  }
  try {
    return JSON.parse(maskKnownSecretsInText(JSON.stringify(details))) as unknown;
  } catch {
    return "unavailable";
  }
}

function validateToolArguments(input: unknown, schema: { properties?: Record<string, unknown>; required?: string[]; additionalProperties?: boolean } | undefined): string | undefined {
  if (!schema) {
    return undefined;
  }
  if (!isObject(input)) {
    return "arguments must be an object.";
  }

  for (const key of schema.required ?? []) {
    if (!(key in input)) {
      return `${key} is required.`;
    }
  }

  const properties = schema.properties ?? {};
  if (schema.additionalProperties === false) {
    const unknownKey = Object.keys(input).find((key) => !(key in properties));
    if (unknownKey) {
      return `${unknownKey} is not allowed.`;
    }
  }

  for (const [key, value] of Object.entries(input)) {
    const propertySchema = properties[key];
    if (propertySchema === undefined) {
      continue;
    }
    const error = validateSchemaProperty(key, value, propertySchema);
    if (error) {
      return error;
    }
  }

  return undefined;
}

function validateSchemaProperty(key: string, value: unknown, schema: unknown): string | undefined {
  if (!isObject(schema)) {
    return undefined;
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return `${key} must be one of ${schema.enum.join(", ")}.`;
  }

  if (schema.type === "string" && typeof value !== "string") {
    return `${key} must be a string.`;
  }
  if (schema.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    return `${key} must be a number.`;
  }
  if (schema.type === "boolean" && typeof value !== "boolean") {
    return `${key} must be a boolean.`;
  }
  if (schema.type === "object" && !isObject(value)) {
    return `${key} must be an object.`;
  }

  return undefined;
}
