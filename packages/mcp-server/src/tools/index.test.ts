import { describe, expect, it } from "vitest";

import { forbiddenMcpToolNames, mcpToolNames } from "./index.js";

describe("MCP tool allowlist", () => {
  it("matches the public MCP tool contract names", () => {
    expect(mcpToolNames).toEqual([
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
    ]);
  });

  it("documents forbidden dangerous tool names", () => {
    expect(forbiddenMcpToolNames).toEqual([
      "vault_reveal",
      "get_secret_value",
      "browser_click",
      "browser_type",
      "shell_exec",
      "read_any_file",
      "write_any_file",
      "delete_file",
      "upload_secret"
    ]);
  });
});
