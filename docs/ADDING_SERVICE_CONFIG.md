# Adding Service Configs

This guide defines how maintainers add a reviewed service to baipiao.

## Files

Add one service YAML file at:

```text
registry/configs/<service>.yaml
```

Do not edit `registry/catalog/*.json` by hand. Runtime catalog files under `registry/catalog` are generated from reviewed configs by:

```bash
pnpm catalog:build
pnpm catalog:validate
```

## Required Fields

Every config must include:

```yaml
id: groq
name: Groq
slug: groq
category: llm
description: Fast inference API.
url: https://groq.com
tags:
  - llm
capability:
  - prompt
```

Use `capability` conservatively:

- `prompt`: baipiao can generate instructions for an Agent.
- `config`: baipiao has reviewed env specs and can validate Agent output.
- `test`: baipiao has a reviewed connection test spec.

## Config

Reviewed service details live under `config`.

```yaml
config:
  urls:
    homepage: https://groq.com
    docs: https://console.groq.com/docs
    apiKeys: https://console.groq.com/keys
  freeTier:
    status: free_tier
    summary: Free tier details.
    confidence: medium
```

Free tier status must be one of `free_tier`, `limited_free`, `paid`, or `unknown`.

## Env

Add env specs only after manual review.

```yaml
env:
  - key: GROQ_API_KEY
    secret: true
    required: true
    public: false
    pattern: ^gsk_[A-Za-z0-9]+$
    description: Groq API key.
```

Rules:

- Do not commit secret values.
- Use `secret: true` for keys, tokens, passwords, private credentials, access keys, and service-role keys.
- Use `public: true` only for values that can safely appear in client configuration.
- Add `pattern` when the provider format is documented and stable.
- Never store `.env.local` values in registry, docs, tests, snapshots, or examples.

## Prompt

Prompt config should point the Agent at reviewed entry pages and constrain output.

```yaml
prompt:
  setupUrl: https://console.groq.com/keys
  projectNamePattern: baipiao-${project_slug}
  steps:
    - Open https://console.groq.com/keys.
    - Create or copy an API key for this project.
  safety:
    - Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
  outputFormat:
    - GROQ_API_KEY=...
```

Prompt rules:

- Include a real entry page.
- Include provider-specific setup steps only when reviewed.
- Include safety rules for billing, CAPTCHA, 2FA, and account challenges.
- Output format must be machine-parseable `KEY=VALUE` lines.

## Test

Use one supported test spec:

```yaml
test:
  type: openai_compatible_chat
  baseUrl: https://api.groq.com/openai/v1
  envKey: GROQ_API_KEY
  modelHint: llama-3.1-8b-instant
```

Supported `test.type` values:

- `openai_compatible_chat`
- `http`
- `supabase`
- `s3_compatible`
- `manual`

Use `manual` when automated validation would require paid features, destructive actions, browser login, CAPTCHA, or private account state.

## free-for-dev Candidates

`free-for-dev` Markdown imports are unreviewed candidates. They may carry:

- `sourceCategory`
- `freeTierText`
- `rawExcerptRef`
- `enrichment` suggestions
- `matchedServiceId`

They must not define trusted `env`, `prompt`, or `test` config unless converted into a reviewed `registry/configs/<service>.yaml` file.

Full candidate lookup is available without promoting entries into trusted service configs:

```bash
baipiao catalog candidates --query openrouter
baipiao catalog candidates --category llm
baipiao catalog categories
baipiao catalog translation-batch --locale zh-CN --limit 100
baipiao catalog translation-batch --locale ja --query openrouter --category llm --source-category "Generative AI"
```

Offline translations can be imported into `items[].enrichment.localization`:

```bash
baipiao catalog localize --locale zh-CN --input translations.zh-CN.json
```

Supported candidate locales are `en`, `zh-CN`, `ja`, `ko`, `fr`, and `es`.

Tips for quality:

- `baipiao catalog translation-batch` defaults to exporting only `untranslatedOnly` candidates for the target locale.  
- Use `--include-translated` to export entries that already have locale fields as well (for review/finalization).
- When importing, empty fields are ignored, and entries whose provided translation is identical to English source text are treated as untranslated and will be skipped.
- Use `node scripts/validate-free-for-dev-localizations.mjs` to check for `fullEnglishCopy`.
- Use `node scripts/clean-free-for-dev-localizations.mjs` to remove stale English-copy localizations after an import or review pass.

## Verification

After adding or changing a service:

```bash
pnpm test packages/core/src/registry/configs.test.ts packages/core/src/registry/catalog.test.ts
pnpm catalog:build
pnpm catalog:validate
pnpm typecheck
pnpm lint
```

Before committing, inspect generated files for accidental values:

```bash
rg "gsk_|sk-or-v1-|AKIA|BEGIN PRIVATE KEY" registry docs test
```
