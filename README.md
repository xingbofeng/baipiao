# baipiao

**An agent-native free-stack configurator for developers.**

![Agent Native](https://img.shields.io/badge/agent--native-111827?style=flat-square)
![MCP Ready](https://img.shields.io/badge/MCP-ready-2563eb?style=flat-square)
![Local Vault](https://img.shields.io/badge/local--vault-secure-16a34a?style=flat-square)
![Free Stack](https://img.shields.io/badge/free--stack-configurator-7c3aed?style=flat-square)

[Website](https://baipiao.counterxing.top) · [Documentation](https://baipiao.counterxing.top/docs/en) · [中文](./README_zh.md)

Languages: [English](./README.md) · [中文](./README_zh.md) · [日本語](./README_ja.md) · [한국어](./README_ko.md) · [Français](./README_fr.md) · [Español](./README_es.md)

baipiao turns the messy ritual of assembling free developer infrastructure into a clean, agent-assisted workflow.

Search for a free-tier service, generate a precise setup prompt, hand it to Codex / Claude Code / Cursor, then let baipiao collect the returned keys, store them in a local Vault, generate `.env`, test the connection, and expose the result through MCP.

![baipiao product demo](./docs/assets/product-demo-english.gif)

## Why It Exists

Modern builders can ship astonishingly far on free tiers: LLM APIs, databases, object storage, hosting, auth, email, monitoring, vector databases, and more.

The problem is not that these services are unavailable. The problem is operational drag.

Every service has a different console, API key page, quota model, onboarding flow, environment variable shape, and security convention. AI coding agents can help, but they need a structured task, a safe boundary, and a place to hand the result back.

baipiao is that control plane.

## The Loop

![baipiao agent setup loop](./docs/assets/agent-setup-loop.svg)

## Product Principles

- **Agent-first, human-approved**: baipiao prepares the work; the user stays in control of login, verification, and sensitive actions.
- **Local by default**: secrets live in the local system credential store, not in a hosted dashboard.
- **Prompt to production**: generated prompts are not notes; they are executable setup briefs for coding agents.
- **Structured where it matters**: known services get validation, env generation, connection tests, and safer status reporting.
- **MCP-native**: Codex, Claude Code, Cursor, and other MCP clients can call baipiao without receiving raw secret values.

## What It Does

| Capability | Description |
|---|---|
| Service catalog | Search free-tier developer services across AI, backend, hosting, storage, auth, and more. |
| Full catalog localization | Query candidate records by keyword/category and import offline translations for zh-CN, ja, ko, fr, and es. |
| Agent setup prompts | Generate provider-specific browser setup instructions for coding agents. |
| Agent output parser | Accept `KEY=VALUE` output from agents and normalize configuration results. |
| Local Vault | Store API keys, tokens, endpoints, project IDs, and connection strings in the OS credential store. |
| Env generation | Produce `.env.local` and `.env.example` from stored configuration. |
| Connection tests | Validate supported services before they enter your working stack. |
| MCP server | Expose safe setup, registry, Vault, env, test, and status tools to agent clients. |

## Quick Start

```bash
npm i -g baipiao
```

Or run it directly:

```bash
npx baipiao init
```

If you're working from a local checkout and do not have a global `baipiao` binary yet, use the built CLI entrypoint:

```bash
pnpm build
node packages/cli/dist/index.js init
```

Then:

```bash
baipiao init
baipiao search llm
baipiao search openruter
baipiao search 数据库
baipiao setup groq
baipiao vault list
baipiao env generate
baipiao test groq
baipiao status
```

## CLI Preview

![baipiao CLI preview](./docs/assets/cli-four-panel-preview.png)

## MCP Integration

Through MCP, Codex, Claude Code, Cursor, and other agent clients can query the full imported [free-for-dev](https://github.com/ripienaar/free-for-dev) catalog, inspect localized candidates, generate setup prompts, and read safe project status without receiving raw secret values.

![baipiao MCP integration example](./docs/assets/mcp-integration-zh.png)

## Example Flow

```bash
baipiao search llm
```

```text
Detected language: en
Found free LLM services from the full free-for-dev catalog.
```

Generate a setup prompt:

```bash
baipiao setup groq
```

baipiao copies a provider-specific prompt for your agent. After the agent finishes the website task, it returns:

```env
GROQ_API_KEY=gsk_xxx
```

baipiao then validates, stores, writes, and tests it:

```text
✓ GROQ_API_KEY format valid
✓ Saved to Vault
✓ Added to .env.local
✓ Connection test passed
```

## Vault

baipiao treats secrets as product infrastructure, not clipboard debris.

```bash
baipiao vault list
baipiao vault set GROQ_API_KEY
baipiao vault import
baipiao vault copy GROQ_API_KEY
baipiao vault reveal GROQ_API_KEY
baipiao vault health
```

Default storage:

| Platform | Store |
|---|---|
| macOS | Keychain |
| Windows | Credential Manager |
| Linux | Secret Service |

Safety rules:

- `vault list` never prints raw secret values.
- `vault copy` uses the clipboard instead of terminal output.
- `vault reveal` requires explicit confirmation.
- MCP tools do not expose raw secret reveal operations.
- Logs and generated status output are designed to avoid leaking keys.

## MCP

Start the MCP server:

```bash
baipiao mcp
```

Install into a client:

```bash
baipiao mcp install codex
baipiao mcp install cursor
baipiao mcp install claude
```

`install` updates the target client configuration in place. You can also copy this manual stdio config map:

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

Codex local HTTP configuration:

```bash
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

Available MCP tool families:

```text
services
full catalog
setup prompts
agent output parsing
vault management
env generation
connection testing
project status
stack recommendation
```

MCP intentionally does not provide tools such as `vault_reveal`, `get_secret_value`, browser control, shell execution, or secret upload.

## Boundaries

baipiao does not:

- Store website login passwords.
- Bypass CAPTCHA, 2FA, phone verification, or provider risk checks.
- Auto-register accounts.
- Click billing, upgrade, payment, subscribe, or paid-plan actions.
- Upload secrets to a remote baipiao service.

## Disclaimer

baipiao is an independent developer tool and is not affiliated with the third-party services it may reference. Free-tier availability, quotas, pricing, API behavior, and provider terms can change at any time.

You are responsible for reviewing each provider's terms, protecting your own credentials, and deciding what actions an agent is allowed to perform. baipiao helps structure configuration workflows, but it does not guarantee service availability, cost-free usage, security compliance, or legal suitability for your project.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm docs:dev
```

Project docs:

- [Documentation index](./docs/INDEX.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [API / Vault / MCP](./docs/API_AND_VAULT.md)
- [Data sources, normalization, prompts, and MCP flow](./docs/DATA_SOURCES_AND_PROMPTS.md)
- [Website and docs design](./docs/WEBSITE_AND_DOCS.md)

## License

MIT

## Acknowledgements

baipiao's full free-service candidate catalog is inspired by and derived from [free-for-dev](https://github.com/ripienaar/free-for-dev).
