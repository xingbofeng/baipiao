---
translationStatus: translation_pending
---
# MCP

MCP is the protocol layer that exposes `baipiao`'s core capabilities to external AI coding tools (Claude Code, Cursor, Codex). All tools operate on an allowlist — dangerous operations are explicitly blocked.

## Start Here

Install the CLI and register baipiao in your MCP client:

```bash
# Install the CLI
npm install -g baipiao

# Install MCP config for Cursor
baipiao mcp install cursor

# Install MCP config for Claude Code
baipiao mcp install claude

# Install MCP config for Codex
baipiao mcp install codex
```

Minimal Codex install:

```bash
# stdio, recommended for local use
baipiao mcp install codex
```

Copyable manual config map:

```json
{
  "mcpServers": {
    "baipiao": {
      "command": "baipiao",
      "args": ["mcp"]
    }
  }
}
```

For local HTTP MCP:

```bash
# Install a local HTTP MCP URL
baipiao mcp install codex --port 7333
```

```json
{
  "mcpServers": {
    "baipiao": {
      "url": "http://127.0.0.1:7333/mcp"
    }
  }
}
```

Common MCP calls look like this:

```text
# Default search uses the full free catalog and supports fuzzy matching
mcp: list_services { "query": "openruter", "limit": 20 }

# Use this when you need locale, pagination, or sourceCategory
mcp: list_free_catalog_candidates { "query": "openrouter", "locale": "zh-CN", "limit": 20 }

# Generate an Agent setup prompt for a service
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

# Read current project status
mcp: get_status {}
```

## Starting the server

```bash
baipiao mcp                # stdio mode (default)
baipiao mcp --dry-run      # readiness check only
baipiao mcp --port 7331    # local HTTP MCP server
baipiao mcp install cursor # install client config
```

## Protocol compatibility

The MCP server handles the standard JSON-RPC lifecycle used by current clients:

- `initialize` returns the negotiated protocol version, tool capability, and `baipiao-mcp` server info.
- `notifications/initialized` and other notifications are accepted without JSON-RPC error responses.
- `ping` returns an empty success result.
- In HTTP mode, notification-only requests return `202` with an empty body instead of a JSON-RPC error payload.

## Security declaration

**MCP does NOT expose the following:**

`vault_reveal`, `get_secret_value`, `browser_click`, `browser_type`, `shell_exec`, `read_any_file`, `write_any_file`, `delete_file`, `upload_secret`

This means:
- Vault plaintext values are never returned to external models
- Arbitrary file read/write is not permitted
- Arbitrary shell or browser execution is not permitted

**Tool annotation legend:**

| Annotation | Meaning |
| --- | --- |
| 🔒 `readOnly` | Read-only, does not modify state |
| ⚡ `idempotent` | Safe to repeat, idempotent |
| ⚠️ `destructive` | Modifies or deletes data |

---

## list_services

Search the full `free-for-dev` catalog with optional filtering by keyword, category, and capability. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | `string` | No | Search keyword, category name, or approximate spelling |
| `category` | `string` | No | Filter by category |
| `capability` | `"prompt" \| "config" \| "test"` | No | Filter by capability tag |
| `limit` | `number` | No | Max results to return |

**Output**

```json
{
  "services": [
    {
      "id": "free-for-dev:generative-ai:openrouter",
      "name": "OpenRouter",
      "category": "llm",
      "capability": ["prompt"],
      "freeTierStatus": "free_tier"
    }
  ]
}
```

## list_free_catalog_candidates

List the full `free-for-dev` catalog with keyword, category, source-category, locale, limit, and offset filters. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | `string` | No | Search keyword |
| `category` | `string` | No | Filter by normalized category |
| `sourceCategory` | `string` | No | Filter by upstream Markdown section |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | No | Requested output locale |
| `systemLocale` | `string` | No | Locale hint from the host environment |
| `limit` | `number` | No | Max results to return |
| `offset` | `number` | No | Pagination offset |

**Output**

```json
{
  "items": [],
  "total": 1237,
  "limit": 50,
  "offset": 0,
  "requestedLocale": "en"
}
```

## get_free_catalog_categories

Return category and source-category counts for the full candidate catalog. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | No | Locale hint for labels |

## get_free_catalog_translation_batch

Return source text for untranslated candidates in one locale. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | Yes | Target locale |
| `query` | `string` | No | Search keyword |
| `category` | `string` | No | Filter by normalized category |
| `sourceCategory` | `string` | No | Filter by upstream Markdown section |
| `limit` | `number` | No | Max results to return |
| `offset` | `number` | No | Pagination offset |
| `untranslatedOnly` | `boolean` | No | Return only entries that are not fully localized |

## apply_free_catalog_translations

Write offline translations back into `enrichment.localization`. ⚡ `idempotent`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | Yes | Target locale |
| `translations` | `array` | Yes | Translation entries with `id`, `name?`, `description?`, `freeTierText?` |

**Output**

```json
{
  "updated": 12,
  "missing": ["free-for-dev:generative-ai:missing-item"]
}
```

## get_service_info

Get complete metadata for a service. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | Yes | Service id or slug |

**Output**

```json
{
  "service": {
    "id": "groq",
    "name": "Groq",
    "slug": "groq",
    "category": "llm",
    "description": "Fast LLM inference API with a free tier.",
    "urls": {
      "homepage": "https://groq.com",
      "console": "https://console.groq.com",
      "apiKeys": "https://console.groq.com/keys",
      "docs": "https://console.groq.com/docs"
    },
    "freeTier": {
      "summary": "Free tier with rate limits for supported models.",
      "requiresCreditCard": false,
      "resetCycle": "daily"
    },
    "env": [
      {
        "key": "GROQ_API_KEY",
        "secret": true,
        "required": true,
        "pattern": "^gsk_[A-Za-z0-9]+$",
        "description": "Groq API Key"
      }
    ],
    "capability": ["prompt", "config", "test"],
    "risks": [
      "Rate limits apply per model",
      "Check current free-tier availability before production use"
    ]
  }
}
```

## generate_setup_prompt

Generate an Agent setup prompt for a service. Structured services receive precise prompts; unstructured services receive a generic template. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | Yes | Service id or slug |
| `projectSlug` | `string` | No | Project identifier for prompt naming |

**Output**

```json
{
  "serviceId": "groq",
  "serviceName": "Groq",
  "prompt": "You are my browser setup assistant.\n\nGoal:\nHelp me configure Groq free-tier resources...\n\nWhen finished, output only:\nGROQ_API_KEY=...",
  "outputFormat": "GROQ_API_KEY=...",
  "requiredEnvKeys": ["GROQ_API_KEY"],
  "capability": ["prompt", "config", "test"]
}
```

## parse_agent_output

Parse Agent-returned text and extract KEY=VALUE entries. Does not persist. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | `string` | Yes | Raw text returned by the Agent |
| `serviceId` | `string` | No | Associated service id for format validation and field mapping |

**Output**

```json
{
  "entries": [
    { "key": "GROQ_API_KEY", "value": "gsk_xxx", "secret": true }
  ],
  "notes": ["Parsed 1 entry from KEY=VALUE format"],
  "warnings": []
}
```

Parse failure:

```json
{
  "entries": [],
  "notes": [],
  "warnings": [
    "Line 3 could not be parsed: 'some invalid text'"
  ]
}
```

**Supported input formats**

- Env format: `KEY=VALUE`
- Markdown fenced code block
- Colon format: `API Key: abc`, `Endpoint: https://example.com`

## save_agent_output

Parse Agent output and persist to Vault. ⚡ `idempotent`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | Yes | Service id or slug |
| `text` | `string` | Yes | Raw text returned by the Agent |

**Output**

```json
{
  "saved": [
    { "key": "GROQ_API_KEY", "serviceId": "groq", "scope": "server" }
  ],
  "failed": [],
  "state": "configured"
}
```

Partial failure:

```json
{
  "saved": [
    { "key": "SUPABASE_URL", "serviceId": "supabase", "scope": "public" }
  ],
  "failed": [
    {
      "key": "SUPABASE_ANON_KEY",
      "reason": "Pattern mismatch: expected ^eyJ..."
    }
  ],
  "state": "configured_unverified"
}
```

## validate_secret

Validate the format of a single key value and return matching services. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Environment variable key name |
| `value` | `string` | Yes | Value to validate |

**Output**

```json
{
  "valid": true,
  "key": "GROQ_API_KEY",
  "serviceIds": ["groq"],
  "reason": null
}
```

```json
{
  "valid": false,
  "key": "GROQ_API_KEY",
  "serviceIds": [],
  "reason": "Pattern mismatch: expected ^gsk_[A-Za-z0-9]+$"
}
```

## vault_list

List metadata for all keys in the Vault. **Never returns plaintext values.** 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | No | Filter by service |

**Output**

```json
{
  "entries": [
    {
      "key": "GROQ_API_KEY",
      "serviceId": "groq",
      "status": "stored",
      "scope": "server",
      "lastTestAt": "2026-05-12T12:03:04.000Z"
    },
    {
      "key": "OPENROUTER_API_KEY",
      "serviceId": "openrouter",
      "status": "missing",
      "scope": "server",
      "lastTestAt": null
    }
  ]
}
```

## vault_set

Store a single secret. Value is not echoed back. ⚡ `idempotent`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Environment variable key name |
| `value` | `string` | Yes | Value to store (not echoed back) |
| `serviceId` | `string` | No | Associated service id |

**Output**

```json
{
  "saved": true,
  "key": "GROQ_API_KEY",
  "serviceId": "groq",
  "scope": "server"
}
```

## vault_import

Bulk import KEY=VALUE, with automatic parsing, validation, and persistence. ⚡ `idempotent`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | `string` | Yes | Multi-line KEY=VALUE text |
| `serviceId` | `string` | No | Associated service id |

**Output**

```json
{
  "saved": [
    { "key": "GROQ_API_KEY", "serviceId": "groq" },
    { "key": "GEMINI_API_KEY", "serviceId": "gemini" }
  ],
  "failed": [],
  "warnings": []
}
```

## vault_copy

Copy a key's value to the clipboard. **Value is never returned through MCP.** ⚡ `idempotent`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Key name to copy |

**Output**

```json
{
  "copied": true,
  "key": "GROQ_API_KEY"
}
```

```json
{
  "copied": false,
  "key": "UNKNOWN_KEY",
  "reason": "Key not found in Vault"
}
```

## vault_remove

Delete a key from the system credential store. ⚠️ `destructive`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Key name to delete |

**Output**

```json
{
  "removed": true,
  "key": "GROQ_API_KEY"
}
```

## vault_health

Check the health status of all stored keys. 🔒 `readOnly`

**Input**

None

**Output**

```json
{
  "items": [
    {
      "key": "GROQ_API_KEY",
      "status": "healthy",
      "formatValid": true,
      "connection": "passed",
      "warnings": []
    },
    {
      "key": "SUPABASE_SERVICE_ROLE_KEY",
      "status": "warning",
      "formatValid": true,
      "connection": "passed",
      "warnings": ["server-only key: do not expose to frontend"]
    },
    {
      "key": "OPENROUTER_API_KEY",
      "status": "missing",
      "formatValid": null,
      "connection": null,
      "warnings": ["Key not found in Vault"]
    }
  ]
}
```

## generate_env

Generate environment variable files from Vault. ⚠️ `destructive` (writes to filesystem)

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | No | Target file path, defaults to `.env.local` |
| `example` | `boolean` | No | Generate `.env.example` (key names only) |
| `includeUnverified` | `boolean` | No | Include unverified config entries |

**Output**

```json
{
  "path": ".env.local",
  "writtenKeys": ["GROQ_API_KEY", "GEMINI_API_KEY", "SUPABASE_URL"],
  "missingKeys": ["OPENROUTER_API_KEY"]
}
```

## test_connection

Run a connectivity test for the specified service. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `serviceId` | `string` | Yes | Service id or slug |

**Output**

```json
{
  "serviceId": "groq",
  "ok": true,
  "status": "passed",
  "message": "Connection successful",
  "latencyMs": 234
}
```

```json
{
  "serviceId": "free-for-dev:apis-data-and-ml:huggingface-co",
  "ok": false,
  "status": "skipped",
  "message": "Service does not support automated testing",
  "latencyMs": null
}
```

## get_status

Get the current project's global status summary. 🔒 `readOnly`

**Input**

None

**Output**

```json
{
  "project": {
    "name": "my-ai-tool",
    "slug": "my-ai-tool",
    "envPath": ".env.local"
  },
  "services": [
    { "serviceId": "groq", "state": "tested" },
    { "serviceId": "openrouter", "state": "not_started" },
    { "serviceId": "gemini", "state": "configured" },
    { "serviceId": "supabase", "state": "tested" }
  ],
  "vault": {
    "entryCount": 6,
    "storedCount": 5,
    "missingCount": 1
  },
  "env": {
    "ready": true
  },
  "test": {
    "status": "not_run"
  }
}
```

## recommend_stack

Recommend a free technology stack by project type. 🔒 `readOnly`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `useCase` | `"ai_saas" \| "rag" \| "blog" \| "agent_tool" \| "mobile_app" \| "custom"` | Yes | Project type |

**Output**

```json
{
  "stack": {
    "useCase": "ai_saas",
    "services": [
      { "role": "LLM", "serviceId": "groq", "required": true },
      { "role": "LLM Backup", "serviceId": "openrouter", "required": false },
      { "role": "Database", "serviceId": "supabase", "required": true },
      { "role": "Storage", "serviceId": "cloudflare-r2", "required": true },
      { "role": "Auth", "serviceId": "clerk", "required": false },
      { "role": "Email", "serviceId": "resend", "required": false }
    ],
    "notes": [
      "All services support free tier",
      "Set up groq first — other services may depend on auth flow"
    ]
  }
}
```

## Tool overview

| Tool | Type | Description |
| --- | --- | --- |
| `list_services` | 🔒 readOnly | Search the service catalog |
| `get_service_info` | 🔒 readOnly | Get service details |
| `generate_setup_prompt` | 🔒 readOnly | Generate an Agent setup prompt |
| `parse_agent_output` | 🔒 readOnly | Parse Agent output |
| `save_agent_output` | ⚡ idempotent | Save Agent output to Vault |
| `validate_secret` | 🔒 readOnly | Validate key format |
| `vault_list` | 🔒 readOnly | List Vault metadata |
| `vault_set` | ⚡ idempotent | Store a single key |
| `vault_import` | ⚡ idempotent | Bulk import keys |
| `vault_copy` | ⚡ idempotent | Copy key to clipboard |
| `vault_remove` | ⚠️ destructive | Delete a key |
| `vault_health` | 🔒 readOnly | Key health check |
| `generate_env` | ⚠️ destructive | Write env file |
| `test_connection` | 🔒 readOnly | Test service connectivity |
| `get_status` | 🔒 readOnly | Project status summary |
| `recommend_stack` | 🔒 readOnly | Recommend a stack |

## Install options

### Cursor

```bash
baipiao mcp install cursor
```

Output:

```json
{
  "client": "cursor",
  "transport": "stdio",
  "command": "baipiao",
  "args": ["mcp"]
}
```

### Claude / Codex (HTTP)

```bash
baipiao mcp install claude --port 7331
```

Output:

```json
{
  "client": "claude",
  "transport": "http",
  "url": "http://127.0.0.1:7331/mcp",
  "localOnly": true
}
```

> Use `baipiao mcp --port 7331` to start the HTTP server, then use `baipiao mcp install <client> --port 7331` to install matching client configuration.

## Example tool usage

```text
1) Search for LLM services
mcp: list_services { "query": "llm", "capability": "config", "limit": 10 }

2) Get Groq details
mcp: get_service_info { "serviceId": "groq" }

3) Generate setup prompt
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

4) Save Agent output
mcp: save_agent_output {
  "serviceId": "groq",
  "text": "GROQ_API_KEY=gsk_xxx"
}

5) Check status
mcp: get_status {}

6) Generate env
mcp: generate_env { "example": false }
```
