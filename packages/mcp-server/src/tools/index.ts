export const mcpToolNames = [
  "list_services",
  "list_free_catalog_candidates",
  "get_free_catalog_categories",
  "apply_free_catalog_translations",
  "get_free_catalog_translation_batch",
  "get_service_info",
  "generate_setup_prompt",
  "parse_agent_output",
  "save_agent_output",
  "validate_secret",
  "vault_list",
  "vault_set",
  "vault_import",
  "vault_copy",
  "vault_remove",
  "vault_health",
  "generate_env",
  "test_connection",
  "get_status",
  "recommend_stack"
] as const;

export type McpToolName = (typeof mcpToolNames)[number];

export type JsonSchemaObject = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type McpToolDefinition = {
  name: McpToolName;
  description: string;
  inputSchema: JsonSchemaObject;
};

export const mcpToolDefinitions: McpToolDefinition[] = [
  {
    name: "list_services",
    description: "Search the full free-for-dev catalog by query, category, capability, and limit. This is the default MCP search entrypoint.",
    inputSchema: objectSchema({
      query: { type: "string" },
      category: { type: "string" },
      capability: { type: "string", enum: ["prompt", "config", "test"] },
      systemLocale: { type: "string" },
      limit: { type: "number" }
    })
  },
  {
    name: "list_free_catalog_candidates",
    description: "List the full free-for-dev catalog by query, category, source category, locale, limit, and offset.",
    inputSchema: objectSchema({
      query: { type: "string" },
      category: { type: "string" },
      sourceCategory: { type: "string" },
      locale: { type: "string", enum: ["en", "zh-CN", "ja", "ko", "fr", "es"] },
      systemLocale: { type: "string" },
      limit: { type: "number" },
      offset: { type: "number" }
    })
  },
  {
    name: "get_free_catalog_categories",
    description: "List category and upstream source-category counts for the full free-for-dev catalog.",
    inputSchema: objectSchema({
      locale: { type: "string", enum: ["en", "zh-CN", "ja", "ko", "fr", "es"] }
    })
  },
  {
    name: "apply_free_catalog_translations",
    description: "Apply offline translations to full free-for-dev catalog candidates.",
    inputSchema: objectSchema({
      locale: { type: "string", enum: ["zh-CN", "ja", "ko", "fr", "es"] },
      translations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            freeTierText: { type: "string" }
          },
          required: ["id"],
          additionalProperties: false
        }
      }
    }, ["locale", "translations"])
  },
  {
    name: "get_free_catalog_translation_batch",
    description: "Return source fields for untranslated full free-for-dev catalog candidates in one target locale.",
    inputSchema: objectSchema({
      locale: { type: "string", enum: ["zh-CN", "ja", "ko", "fr", "es"] },
      query: { type: "string" },
      category: { type: "string" },
      sourceCategory: { type: "string" },
      limit: { type: "number" },
      offset: { type: "number" },
      untranslatedOnly: { type: "boolean" }
    }, ["locale"])
  },
  {
    name: "get_service_info",
    description: "Get service metadata, URLs, env key metadata, free tier, capability, and risks.",
    inputSchema: objectSchema({ serviceId: { type: "string" } }, ["serviceId"])
  },
  {
    name: "generate_setup_prompt",
    description: "Generate a setup prompt for a structured service or prompt-only candidate.",
    inputSchema: objectSchema({
      serviceId: { type: "string" },
      projectSlug: { type: "string" }
    }, ["serviceId"])
  },
  {
    name: "parse_agent_output",
    description: "Parse Agent output without saving values.",
    inputSchema: objectSchema({
      serviceId: { type: "string" },
      text: { type: "string" }
    }, ["text"])
  },
  {
    name: "save_agent_output",
    description: "Parse, validate, save, and summarize Agent output for one service.",
    inputSchema: objectSchema({
      serviceId: { type: "string" },
      text: { type: "string" }
    }, ["serviceId", "text"])
  },
  {
    name: "validate_secret",
    description: "Validate one key/value pair without echoing the value.",
    inputSchema: objectSchema({
      key: { type: "string" },
      value: { type: "string" }
    }, ["key", "value"])
  },
  {
    name: "vault_list",
    description: "List public Vault metadata.",
    inputSchema: objectSchema({ serviceId: { type: "string" } })
  },
  {
    name: "vault_set",
    description: "Save one Vault entry without echoing its value.",
    inputSchema: objectSchema({
      key: { type: "string" },
      value: { type: "string" },
      serviceId: { type: "string" }
    }, ["key", "value"])
  },
  {
    name: "vault_import",
    description: "Import multiple Vault entries from env text or Agent output.",
    inputSchema: objectSchema({
      text: { type: "string" },
      serviceId: { type: "string" }
    }, ["text"])
  },
  {
    name: "vault_copy",
    description: "Copy one Vault value through the host clipboard adapter without returning it.",
    inputSchema: objectSchema({ key: { type: "string" } }, ["key"])
  },
  {
    name: "vault_remove",
    description: "Remove one Vault entry.",
    inputSchema: objectSchema({ key: { type: "string" } }, ["key"])
  },
  {
    name: "vault_health",
    description: "Report Vault health without values.",
    inputSchema: objectSchema({})
  },
  {
    name: "generate_env",
    description: "Generate .env.local or .env.example from Vault metadata.",
    inputSchema: objectSchema({
      path: { type: "string" },
      example: { type: "boolean" },
      includeUnverified: { type: "boolean" }
    })
  },
  {
    name: "test_connection",
    description: "Run a service connection test.",
    inputSchema: objectSchema({ serviceId: { type: "string" } }, ["serviceId"])
  },
  {
    name: "get_status",
    description: "Get project, service, Vault, env, and test status summary.",
    inputSchema: objectSchema({})
  },
  {
    name: "recommend_stack",
    description: "Recommend a free stack for a project use case.",
    inputSchema: objectSchema({
      useCase: { type: "string", enum: ["ai_saas", "rag", "blog", "agent_tool", "mobile_app", "custom"] }
    }, ["useCase"])
  }
];

export const forbiddenMcpToolNames = [
  "vault_reveal",
  "get_secret_value",
  "browser_click",
  "browser_type",
  "shell_exec",
  "read_any_file",
  "write_any_file",
  "delete_file",
  "upload_secret"
] as const;

export * from "./handlers.js";

function objectSchema(properties: Record<string, unknown>, required: string[] = []): JsonSchemaObject {
  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false
  };
}
