---
translationStatus: translation_pending
---
# Quick Start

`baipiao` is a **Prompt-first / MCP-first** CLI for configuring free developer services. Use it to discover free-tier services, generate safe setup prompts for your AI coding agent, collect the agent's output, store keys in a local Vault, generate `.env` files, test connectivity, and expose everything to AI tools via MCP.

## Start Here

```bash
npm install -g baipiao
baipiao init --name my-ai-tool
baipiao search llm
baipiao setup groq
baipiao vault list
baipiao env generate
baipiao test groq
```

Use these for the full free catalog:

```bash
baipiao catalog candidates --query openrouter
baipiao catalog candidates --category llm
baipiao catalog candidates --locale zh-CN
```

Use these for MCP setup:

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex
```

## Understand It In 30 Seconds

baipiao is not just a key storage script. It splits "find a free service, ask an Agent to configure it, and safely bring the result back" into a few stable workflows:

| What you need | Entry point | Result |
|---|---|---|
| Find curated free services | `baipiao search llm` | Reviewed services with config/test capability |
| Search the full free catalog | `baipiao catalog candidates --query openrouter` | Full `free-for-dev` candidate search |
| Read candidates in a locale | `baipiao catalog candidates --locale zh-CN` | Localized fields with English fallback |
| Ask an Agent to configure a service | `baipiao setup groq` | Safe setup prompt plus Agent output capture |
| Manage keys and env files | `baipiao vault list` / `baipiao env generate` | Vault storage and `.env.local` generation |
| Expose tools to Agents | `baipiao mcp` | MCP tools for the same capabilities |

The core pipeline is:

```text
Service discovery → Prompt generation → Agent execution → Output parsing → Vault storage → env generation → Connection test → MCP exposure
```

It never automates account registration, never controls a browser, and never stores your web login password. Login, CAPTCHA, 2FA, and billing-sensitive actions stay with the human.

## Prerequisites

- **Node.js >= 20**
- **pnpm** (package manager)
- A terminal (macOS Terminal / iTerm2 / Windows Terminal / Linux shell)
- An MCP-compatible AI coding tool (optional): Cursor / Claude Code / Codex

## Installation

```bash
# Install globally from npm
npm install -g baipiao

# Verify
baipiao --version
```

## Three Usage Paths

Pick the path that matches what you are trying to do:

| Path | Entry | Purpose |
|---|---|---|
| **Structured service setup** | `search` / `info` / `setup` | Configure known services like Groq, OpenRouter, Supabase |
| **Full free catalog** | `catalog candidates` | Search `free-for-dev` candidates by locale, category, and keyword |
| **Agent interface** | `mcp` | Let Cursor / Claude Code / Codex call service, prompt, Vault, env, and test tools |

Most projects start with structured setup, use `catalog` when they need more free-service candidates, and add MCP when the Agent should keep reading project/service state.

## Five steps to your first service

Using **Groq** (free LLM API) as an example.

### Step 1: Initialize a project

```bash
baipiao init --name my-ai-tool
```

This creates `.baipiao/` with `project.json`, `services.json`, `.env.local`, and `.env.example`.

### Step 2: Search and inspect

```bash
# Search for free LLM services
baipiao search llm

# Inspect Groq — required env keys, free tier limits, risk notes
baipiao info groq
```

Example `search` output:

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

### Step 3: Generate an Agent setup prompt

```bash
baipiao prompt groq --copy
```

`--copy` puts the prompt on your clipboard. The prompt includes:
- The target page URL (e.g. `https://console.groq.com/keys`)
- Step-by-step instructions (create an API key, naming conventions)
- **Safety boundaries** (no Billing clicks, no password entry, no CAPTCHA bypass)
- Expected output format (`GROQ_API_KEY=...`)

Paste the prompt to your Agent (Cursor / Claude Code / Codex). The Agent handles the browser work and returns the result.

### Step 4: Parse and save the output

```bash
baipiao setup groq
```

Paste the Agent's output:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

`setup` automatically: parses `KEY=VALUE` → validates format → stores in Vault → writes `.env.local` → runs connection test → updates service state.

### Step 5: Verify

```bash
# Check overall project status
baipiao status

# Test Groq connectivity
baipiao test groq

# List all Vault keys (no plaintext shown)
baipiao vault list
```

## Complete command reference

### Project initialization

- `baipiao init [--name <name>]` — Scaffold `.baipiao` project skeleton

### Service discovery

- `baipiao search <query>` — Search free services by keyword or category (`llm`, `database`, `storage`)
- `baipiao info <service>` — View service metadata, env fields, free tier, risks

### Full free catalog

- `baipiao catalog candidates` — List the full `free-for-dev` candidate catalog
- `baipiao catalog candidates --query openrouter` — Search candidates by user input
- `baipiao catalog candidates --category llm` — Filter by normalized category
- `baipiao catalog candidates --locale zh-CN` — Return candidate fields in a requested locale
- `baipiao prompt huggingface` — Resolve the `huggingface.co` free-catalog candidate by loose alias
- `baipiao catalog categories` — Show candidate category counts
- `baipiao catalog translation-batch --locale ja` — Export entries for translation
- `baipiao catalog localize --locale ja --input translations.ja.json` — Import offline translations

### Prompt generation

- `baipiao prompt <service> [--copy]` — Generate a safe Agent setup prompt

### Configuration

- `baipiao setup <service>` — Interactive full-configuration flow
- `baipiao output <service>` — Import config from external output

### Vault

- `baipiao vault` — Vault overview
- `baipiao vault list` — Show all key statuses (no plaintext)
- `baipiao vault set <KEY>` — Manually store a single key
- `baipiao vault import` — Bulk import `KEY=VALUE`
- `baipiao vault copy <KEY>` — Copy key to clipboard
- `baipiao vault remove <KEY>` — Delete a key
- `baipiao vault health` — Health check for all stored keys

### Env management

- `baipiao env generate` — Write `.env.local` from Vault
- `baipiao env generate --example` — Write `.env.example` (key names only)

### Testing & status

- `baipiao test [service]` — Test service connectivity (supports OpenAI-compatible / HTTP / Supabase / S3)
- `baipiao status` — Global project status summary

### Stack recommendations

- `baipiao stack recommend <type>` — Recommend a free stack by project type
  - `type`: `ai_saas` / `rag` / `blog` / `agent_tool` / `mobile_app` / `custom`
- `baipiao setup-stack <type>` — Batch-generate setup prompts for all services in a stack

### MCP integration

- `baipiao mcp` — Start the MCP stdio server
- `baipiao mcp install <cursor|claude|codex>` — Install MCP client config

## Service capability levels

Every service in baipiao carries capability tags:

| Tag | Meaning |
|---|---|
| `prompt` | Can generate an Agent setup prompt |
| `config` | Structured env keys — can validate and persist |
| `test` | Can automatically test connectivity |

All services support at least `prompt`. Services with structured configuration additionally support `config` and `test`.

## Recommended stacks by project type

Based on `baipiao stack recommend` output:

**AI SaaS (`ai_saas`)**

```text
LLM       → groq / openrouter
Database  → supabase
Storage   → cloudflare-r2
Auth      → clerk
Email     → resend
```

**RAG (`rag`)**

```text
LLM       → groq / gemini
Vector DB → supabase (pgvector)
Storage   → cloudflare-r2
```

## Security model

baipiao is designed around the principle of "secrets never leak":

- **Vault** stores secret keys in the system keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service)
- All logs and status output are **automatically redacted** — no plaintext secrets in the terminal
- MCP **does not expose** dangerous endpoints: `vault_reveal`, `get_secret_value`, etc.
- Every generated prompt includes **mandatory safety boundaries**: no Billing/Upgrade clicks, no CAPTCHA bypass, no password storage
- `.env.example` contains only key names, never values

## Architecture overview

```text
packages/
  cli/           — Terminal command entry point
  core/          — Shared logic: registry, prompt engine, parser, Vault, env, tester
  mcp-server/    — MCP protocol server exposing allowlisted tools

registry/
  catalog/       — Service catalog and category data
  configs/       — Per-service structured YAML configs

templates/
  prompts/       — Prompt templates (structured / generic)
```

## Next steps

- Full CLI command reference → [CLI docs](/docs/en/cli)
- MCP tool contracts and security boundaries → [MCP docs](/docs/en/mcp)
