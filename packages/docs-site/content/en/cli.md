---
translationStatus: translation_pending
---
# CLI

The `baipiao` command-line interface. Every command can be run standalone or chained into a full configuration pipeline.

## Start Here

Install and configure your first service:

```bash
# Install the CLI
npm install -g baipiao

# Initialize the current project
baipiao init --name my-ai-tool

# Search the full free catalog. Fuzzy matching and language detection are on by default.
baipiao search llm

# Misspellings can still resolve likely services such as OpenRouter.
baipiao search openruter

# Generate a setup prompt and capture Agent output
baipiao setup groq

# Generate .env.local from Vault
baipiao env generate

# Test Groq connectivity
baipiao test groq
```

Use catalog candidates when you need table output, pagination, or an explicit locale:

```bash
# Search the full candidate catalog by keyword
baipiao catalog candidates --query openrouter

# Filter by normalized category
baipiao catalog candidates --category llm

# Return candidate fields in a requested locale
baipiao catalog candidates --locale zh-CN
```

## init

```text
baipiao init [--name <name>]
```

Initialize project context. Creates the `.baipiao/` directory skeleton.

| Argument | Type | Description |
| --- | --- | --- |
| `--name` | `<string>` | Project name, also used as the slug. Falls back to the current directory name when omitted |

**Output**

```text
✓ Initialized baipiao in /home/user/my-ai-tool
  Created .baipiao/project.json
  Created .baipiao/services.json
  Created .env.local
  Created .env.example
```

When already initialized:

```text
⚠ Project already initialized at /home/user/my-ai-tool
```

**Examples**

```bash
baipiao init
baipiao init --name my-ai-tool
```

## search

```text
baipiao search <query>
```

Search the full `free-for-dev` catalog by keyword or category. This command now uses the large normalized JSON by default instead of only the small built-in service list.

| Argument | Type | Description |
| --- | --- | --- |
| `<query>` | `string` | Search keyword. Accepts category names (`llm`, `database`, `storage`, `hosting`), service names, approximate spellings, and Chinese/Japanese/Korean/French/Spanish queries |

**Output**

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

Capability tags:

| Tag | Meaning |
| --- | --- |
| `prompt` | Can generate an Agent setup prompt |
| `config` | Structured env keys — can validate and persist |
| `test` | Can automatically test connectivity |

**Examples**

```bash
baipiao search llm
baipiao search openruter
baipiao search database
baipiao search 数据库
baipiao search データベース
baipiao search 데이터베이스
baipiao search "base de données"
baipiao search "base de datos"
baipiao search storage
```

## catalog

```text
baipiao catalog candidates [--query <query>] [--category <category>] [--source-category <sourceCategory>] [--locale <locale>] [--limit <n>] [--offset <n>]
baipiao catalog categories
baipiao catalog localize --locale <locale> --input <path>
baipiao catalog translation-batch --locale <locale> [--query <query>] [--category <category>] [--source-category <sourceCategory>] [--limit <n>] [--offset <n>] [--include-translated]
```

Full `free-for-dev` candidate lookup and offline localization workflow. `candidates` returns the full normalized catalog with keyword/category filtering; `categories` returns category counts; `translation-batch` exports fields for translation; `localize` writes translations back into `enrichment.localization`.

Supported locales:

| Locale | Meaning |
| --- | --- |
| `en` | English source |
| `zh-CN` | Simplified Chinese |
| `ja` | Japanese |
| `ko` | Korean |
| `fr` | French |
| `es` | Spanish |

**Examples**

```bash
baipiao catalog candidates --query openrouter
baipiao catalog candidates --category llm
baipiao catalog translation-batch --locale ja --limit 100
baipiao catalog localize --locale ja --input translations.ja.json
```

## info

```text
baipiao info <service>
```

View service metadata: links, env fields, free tier details, and risk notes.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Service id or slug (e.g. `groq`, `openrouter`, `supabase`) |

**Output**

```text
Groq

  Category    llm
  Homepage    https://groq.com
  Console     https://console.groq.com
  API Keys    https://console.groq.com/keys
  Docs        https://console.groq.com/docs

  Free Tier
  Free tier with rate limits for supported models.
  Requires credit card: No
  Reset cycle: daily

  Environment Variables
  GROQ_API_KEY (secret, required)
    Pattern: ^gsk_[A-Za-z0-9]+$

  Capabilities
  prompt  config  test

  Risks
  • Rate limits apply per model
  • Check current free-tier availability before production use
```

**Examples**

```bash
baipiao info groq
baipiao info supabase
```

## prompt

```text
baipiao prompt <service> [--copy]
```

Generate a safe Agent setup prompt. Structured services (with YAML configs) produce precise prompts; unstructured services receive a generic template.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Service id or slug |
| `--copy` | `boolean` | Copy the generated prompt to the system clipboard |

**Output** (structured service — Groq example)

```text
You are my browser setup assistant.

Goal:
Help me configure Groq free-tier resources and create the required
API key.

Entry page:
https://console.groq.com/keys

Steps:
1. If not logged in, pause and ask me to complete login, CAPTCHA,
   email verification, or 2FA.
2. Create a new API key.
3. Use the name baipiao-${project_slug}.
4. Copy the generated API key.

Safety rules:
• Do not ask for or store my web login password.
• Do not bypass CAPTCHA, 2FA, phone verification, or platform risk checks.
• Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
• Do not enable any paid feature.

When finished, output only:
GROQ_API_KEY=...
```

**Examples**

```bash
baipiao prompt groq
baipiao prompt groq --copy
baipiao prompt huggingface # resolves the huggingface.co free-catalog candidate
```

## setup

```text
baipiao setup <service>
```

Interactive full-configuration flow: generate prompt → wait for Agent output → parse → validate → persist → write env → test.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Service id or slug |

**Interactive flow**

```text
$ baipiao setup groq

→ Generating setup prompt for Groq...
✓ Prompt copied to clipboard

Paste the Agent's output below (end with an empty line):
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

✓ Parsed 1 entry
✓ GROQ_API_KEY format valid
✓ Saved to Vault
✓ Added to .env.local
→ Running connection test...
✓ Connection test passed (latency: 234ms)

Status: tested
```

**State machine**

```text
not_started → prompt_generated → agent_output_received
  → configured_unverified → configured → tested
```

**Examples**

```bash
baipiao setup groq
baipiao setup supabase
```

## output

```text
baipiao output <service> [--input <text>]
```

Same entry point as `setup`, for importing Agent output from external sources.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Service id or slug |
| `--input` | `<string>` | Directly pass KEY=VALUE text, skipping interactive paste |

**Supported input formats**

- Env format: `KEY=VALUE`
- Fenced code block:
  ````text
  ```env
  GROQ_API_KEY=gsk_xxx
  ```
  ````
- Colon format: `API Key: abc`, `Endpoint: https://example.com`

**Examples**

```bash
baipiao output groq
baipiao output groq --input "GROQ_API_KEY=gsk_xxx"
```

## env generate

```text
baipiao env generate [--example] [--include-unverified]
```

Read stored configuration from Vault and write environment variable files.

| Argument | Type | Description |
| --- | --- | --- |
| `--example` | `boolean` | Write `.env.example` (key names only, no values) |
| `--include-unverified` | `boolean` | Include unverified config with risk warnings |

**Output**

```text
$ baipiao env generate
✓ .env.local written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

$ baipiao env generate --example
✓ .env.example written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
```

**Examples**

```bash
baipiao env generate
baipiao env generate --example
baipiao env generate --include-unverified
```

## test

```text
baipiao test [<service>]
```

Test service connectivity. When no service is specified, tests all tracked services in the current project.

| Argument | Type | Description |
| --- | --- | --- |
| `<service>` | `string` | Optional. Service id or slug |

**Output**

```text
$ baipiao test groq

Groq
  Test type: openai_compatible_chat
  Status: passed
  Latency: 234ms

$ baipiao test free-for-dev:apis-data-and-ml:huggingface-co

Hugging Face candidate
  Test type: not supported
  Status: skipped
```

**Supported test types**

| Type | Description |
| --- | --- |
| `openai_compatible_chat` | Sends a chat completion request to validate the API key (Groq, OpenRouter) |
| `http` | HTTP GET/POST validation (Gemini) |
| `supabase` | Validates Supabase URL + Anon Key |
| `s3_compatible` | Validates S3-compatible storage connectivity (Cloudflare R2) |

**Examples**

```bash
baipiao test
baipiao test groq
baipiao test supabase
```

## status

```text
baipiao status
```

Display a summary of the current project's global state.

**Output**

```text
baipiao Status

Project
  Name      my-ai-tool
  Slug      my-ai-tool
  Env path  .env.local

Services
  groq            tested
  openrouter      not_started
  gemini          configured
  supabase        tested

Vault
  Total entries   6
  Stored          5
  Missing         1

Quick actions
  baipiao setup openrouter
  baipiao vault health
  baipiao env generate
```

**Examples**

```bash
baipiao status
```

## stack recommend

```text
baipiao stack recommend <type>
```

Recommend a free technology stack by project type.

| Argument | Type | Description |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | Project type |

**Output**

```text
$ baipiao stack recommend ai_saas

Recommended Stack: AI SaaS

  LLM         groq / openrouter
  Database    supabase
  Storage     cloudflare-r2
  Auth        clerk
  Email       resend
  Monitoring  (none recommended)
```

**Examples**

```bash
baipiao stack recommend ai_saas
baipiao stack recommend rag
baipiao stack recommend blog
```

## setup-stack

```text
baipiao setup-stack <type>
```

Emit setup prompt sections for each service in the recommended stack.

| Argument | Type | Description |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | Project type |

**Examples**

```bash
baipiao setup-stack ai_saas
```

## vault

```text
baipiao vault [<subcommand>]
```

Unified secret management center. Without a subcommand, opens the Vault overview.

**Subcommands**

### vault list

```text
baipiao vault list [--service <service>]
```

List all key statuses. No plaintext values are displayed.

| Argument | Type | Description |
| --- | --- | --- |
| `--service` | `<string>` | Optional. Filter by service |

```text
KEY                           STATUS     SCOPE    SERVICE
GROQ_API_KEY                  stored     server   groq
GEMINI_API_KEY                stored     server   gemini
SUPABASE_URL                  stored     public   supabase
SUPABASE_ANON_KEY             stored     public   supabase
OPENROUTER_API_KEY            missing    server   openrouter
```

### vault set

```text
baipiao vault set <KEY> [--service <service>] [--value <value>]
```

Manually store a single secret. Input is hidden (no echo).

| Argument | Type | Description |
| --- | --- | --- |
| `<KEY>` | `string` | Environment variable key name |
| `--service` | `<string>` | Optional. Associated service id |
| `--value` | `<string>` | Optional. Non-interactive value for CI/Agent workflows |

```text
$ baipiao vault set GROQ_API_KEY
Enter value for GROQ_API_KEY: ********
✓ GROQ_API_KEY saved to Vault
✓ Matched service: groq

$ baipiao vault set CUSTOM_TOKEN --service manual --value xxx
```

### vault import

```text
baipiao vault import [--service <service>] [--input <KEY=VALUE...>]
```

Bulk import KEY=VALUE text. Automatically parses, validates, and persists.

```text
$ baipiao vault import
Paste KEY=VALUE lines (end with empty line):
GROQ_API_KEY=gsk_xxx
GEMINI_API_KEY=xxx

✓ Parsed 2 entries
✓ GROQ_API_KEY saved
✓ GEMINI_API_KEY saved

$ baipiao vault import --service manual --input "CUSTOM_TOKEN=xxx"
```

### vault copy

```text
baipiao vault copy <KEY>
```

Copy the value of the specified key to the clipboard. Never prints to the terminal.

```text
$ baipiao vault copy GROQ_API_KEY
✓ GROQ_API_KEY copied to clipboard
✓ Clipboard will be cleared in 30 seconds
```

### vault reveal

```text
baipiao vault reveal <KEY>
```

Display the plaintext value in the terminal. **Requires explicit confirmation.** Not exposed via MCP.

```text
$ baipiao vault reveal GROQ_API_KEY
This will print the secret value in your terminal. Continue? y/N
```

### vault remove

```text
baipiao vault remove <KEY>
```

Delete the specified key from the system credential store.

```text
$ baipiao vault remove GROQ_API_KEY
✓ GROQ_API_KEY removed from Vault
⚠ This key still appears in .env.local. Remove it? y/N
```

### vault health

```text
baipiao vault health
```

Check the status and format validity of all stored keys.

```text
✓ GROQ_API_KEY              format valid / connection passed
! OPENROUTER_API_KEY        missing
✓ GEMINI_API_KEY            format valid / connection passed
! SUPABASE_SERVICE_ROLE_KEY server-only, do not expose to frontend
```

## mcp

```text
baipiao mcp
baipiao mcp --dry-run
baipiao mcp --port 7331
```

Start an MCP server for AI coding tools. `baipiao mcp` starts stdio mode; `--port` starts a local HTTP server.

| Argument | Type | Description |
| --- | --- | --- |
| `--dry-run` | `boolean` | Check readiness without starting the actual server |
| `--port` | `<number>` | Start local HTTP MCP server on `127.0.0.1:<port>` |

**Examples**

```bash
baipiao mcp
baipiao mcp --dry-run
baipiao mcp --port 7331
```

## mcp install

```text
baipiao mcp install <client> [--port <port>]
```

Install baipiao into the target MCP client. The command updates the client config in place:

- Cursor: writes `~/.cursor/mcp.json`
- Claude Code: runs `claude mcp add --scope user ...`
- Codex: runs `codex mcp add ...`

| Argument | Type | Description |
| --- | --- | --- |
| `<client>` | `cursor \| claude \| codex` | Target AI coding tool |
| `--port` | `<number>` | Install HTTP client config pointing at `http://127.0.0.1:<port>/mcp` |

**Manual config map** (stdio mode)

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

**Manual config map** (HTTP mode)

```json
{
  "mcpServers": {
    "baipiao": {
      "url": "http://127.0.0.1:7331/mcp"
    }
  }
}
```

> Use `baipiao mcp --port 7331` to start the HTTP server, then use `baipiao mcp install <client> --port 7331` to install matching client configuration.

**Examples**

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex --port 7331
```

## Security expectations

- Never automates billing, upgrade, or subscription clicks
- Never stores web login passwords
- Never bypasses CAPTCHA, 2FA, phone verification, or platform risk checks
- `vault list` never prints plaintext; `vault copy` uses the clipboard instead of the terminal
- MCP does not expose `vault_reveal`, `get_secret_value`, `shell_exec`, `browser_click`, or similar dangerous endpoints
- Logs and status output are redacted by default
