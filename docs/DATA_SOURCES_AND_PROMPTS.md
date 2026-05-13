# 数据源、Normalize、Prompt 与 MCP 流程

## 总链路

```text
free-for-dev README
→ baipiao catalog refresh --source free-for-dev
→ raw snapshot
→ normalized.json
→ Agent enrichment
→ review
→ committed registry artifacts
→ registry merge
→ search / info
→ prompt / setup
→ MCP generate_setup_prompt
```

## 数据源

`free-for-dev` 没有官方统一 JSON schema。baipiao 只把它当作 Markdown 上游来源。

```text
source: https://github.com/ripienaar/free-for-dev
raw:    https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md
```

刷新命令：

```bash
baipiao catalog refresh --source free-for-dev
```

刷新后写入：

```text
registry/sources/free-for-dev/source.json
registry/sources/free-for-dev/raw/
registry/sources/free-for-dev/normalized.json
registry/sources/free-for-dev/snapshots/
```

## Normalize

baipiao 自己定义稳定 normalized schema。

```json
{
  "schemaVersion": "baipiao.normalized-catalog.v1",
  "generatedAt": "ISO time",
  "source": {
    "id": "free-for-dev",
    "url": "https://github.com/ripienaar/free-for-dev",
    "rawUrl": "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
    "license": "unknown",
    "etag": "optional",
    "commitSha": "optional",
    "stale": false
  },
  "parser": {
    "name": "free-for-dev-markdown",
    "version": "1"
  },
  "stats": {},
  "items": []
}
```

单条候选服务：

```json
{
  "id": "free-for-dev:generative-ai:groq",
  "name": "Groq",
  "slug": "groq",
  "category": "llm",
  "sourceCategory": "Generative AI",
  "description": "...",
  "url": "https://example.com",
  "capability": ["prompt"],
  "freeTierText": "...",
  "freeTierStatus": "free_tier",
  "confidence": "medium",
  "reviewStatus": "needs_review",
  "matchedServiceId": null,
  "warnings": []
}
```

规则：

- Markdown 二级标题映射为 `sourceCategory`。
- 第一个 Markdown link text 映射为 `name`。
- 第一个 Markdown link href 映射为 `url`。
- link 后文本映射为 `description` 和 `freeTierText`。
- 新候选服务默认只有 `capability: ["prompt"]`。
- 未人工审核前 `reviewStatus: "needs_review"`。
- 不从 Markdown 自动生成 `env`、`test`、`prompt.steps`、`apiKeyUrl`、`consoleUrl`。

## Agent enrichment

为了让返回数据更完整，baipiao 可以在 deterministic parser 之后增加 Agent enrichment。

这一步是维护者侧 catalog build pipeline，不是用户运行时行为。用户请求 MCP 时不会触发 Agent 整理、外部搜索或网页抓取。

```text
normalized item
→ Agent 查官网 / docs / pricing / API key 页面
→ 返回建议字段
→ 写入 enrichment
→ 等待 review
→ 产物提交进仓库
```

Agent enrichment 可以补：

- docs URL
- console URL
- API key 页面候选 URL
- pricing / free tier 页面
- setup hints
- env key hints
- tags
- 中文翻译
- warnings

但这些字段都是建议，不是可信结构化配置。

```json
{
  "enrichment": {
    "status": "completed",
    "method": "agent",
    "sources": [],
    "urls": {
      "docs": "https://example.com/docs",
      "console": "https://example.com/dashboard",
      "apiKeys": "https://example.com/settings/api-keys",
      "pricing": "https://example.com/pricing"
    },
    "setupHints": [],
    "envKeyHints": [],
    "freeTier": {
      "status": "free_tier",
      "summary": "",
      "requiresCreditCard": null,
      "limits": []
    },
    "localization": {
      "zh-CN": {
        "description": "",
        "freeTierText": "",
        "status": "machine_translated",
        "reviewStatus": "needs_review"
      }
    },
    "confidence": "medium",
    "reviewStatus": "needs_review",
    "warnings": []
  }
}
```

限制：

- `envKeyHints` 不能直接当作 `EnvVarSpec`。
- `apiKeys` URL 不能直接当作结构化 prompt entry page。
- Agent enrichment 不能把服务升级为 `config` 或 `test`。
- 只有人工审核或明确服务配置文件可以升级结构化能力。
- Agent 不登录、不点击、不创建账号、不创建 API key、不处理 CAPTCHA/2FA。

## 仓库产物

开发/发布前维护者生成并提交：

```text
registry/sources/free-for-dev/source.json
registry/sources/free-for-dev/raw/<snapshot>.md
registry/sources/free-for-dev/normalized.json
registry/sources/free-for-dev/snapshots/<snapshot>.json
registry/catalog/services.json
registry/catalog/categories.json
registry/catalog/metadata.json
```

用户安装后：

```text
baipiao search
baipiao info
baipiao prompt
baipiao mcp
```

都只读本地随包发布的 registry，不在请求时重新整理 free-for-dev。

`baipiao search <query>` 默认读取 `registry/sources/free-for-dev/normalized.json` 这份全量大 JSON，并做模糊匹配。`registry/catalog/services.json` 只保留给结构化配置、测试和高可信服务元数据使用。

## 全量候选查询

`registry/sources/free-for-dev/normalized.json` 是全量白嫖候选数据，不等同于已审核的 `registry/catalog/services.json`。

CLI 查询：

```bash
baipiao search openruter
baipiao search 数据库
baipiao catalog candidates
baipiao catalog candidates --query openrouter
baipiao catalog candidates --category llm
baipiao catalog candidates --source-category "Generative AI"
baipiao catalog candidates --locale zh-CN
baipiao catalog candidates --limit 50 --offset 0
baipiao catalog categories
baipiao catalog translation-batch --locale ja --limit 100 --offset 0
baipiao catalog translation-batch --locale ja --query openrouter --category llm --source-category "Generative AI" --limit 100 --offset 0
baipiao catalog translation-batch --locale fr --include-translated --limit 50 --offset 0
```

MCP 查询：

```json
{
  "tool": "list_services",
  "arguments": {
    "query": "openruter",
    "limit": 20
  }
}
```

需要指定语言、分页或 source-category 时：

```json
{
  "tool": "list_free_catalog_candidates",
  "arguments": {
    "query": "openrouter",
    "category": "llm",
    "locale": "en",
    "limit": 50,
    "offset": 0
  }
}
```

```json
{
  "tool": "get_free_catalog_categories",
  "arguments": {}
}
```

```json
{
  "tool": "get_free_catalog_translation_batch",
  "arguments": {
    "locale": "ja",
    "limit": 100,
    "offset": 0,
    "query": "openrouter",
    "category": "llm",
    "sourceCategory": "Generative AI",
    "untranslatedOnly": true
  }
}
```

支持语言：

- `en`
- `zh-CN`
- `ja`
- `ko`
- `fr`
- `es`

返回语言优先级：

- 显式 `--locale` 或 MCP `locale`
- 查询入参语言识别
- 系统 locale，例如 `LANG`、`LC_ALL`、`LC_MESSAGES`
- `en`

当请求语言没有本地翻译时，返回英文并标记 `translationStatus: "fallback"`。

## 离线翻译导入

翻译数据不在用户请求时自动生成。维护者应离线生成翻译 JSON，再写回 normalized catalog。

导出待翻译批次：

```bash
baipiao catalog translation-batch --locale ja --limit 100 --offset 0
```

默认只导出目标语言尚未完整翻译（`name`、`description`、`freeTierText` 均完整且不与英文完全一致）的条目。需要包含已有翻译用于复核时，加 `--include-translated`。

CLI 导入：

```bash
baipiao catalog localize --locale ja --input translations.ja.json
```

导入文件支持三种形态：

- `{ "translations": [...] }`
- `{ "items": [...] }`
- 直接数组 `[...]`

其中 `items[]` 形式会优先复用 `existingTranslation`，适合人工复核后再回灌。

MCP 导入：

```json
{
  "tool": "apply_free_catalog_translations",
  "arguments": {
    "locale": "ja",
    "translations": [
      {
        "id": "free-for-dev:generative-ai:openrouter",
        "name": "オープンルーター",
        "description": "無料モデルを含む LLM ゲートウェイ。",
        "freeTierText": "無料モデルが含まれます。"
      }
    ]
  }
}
```

翻译写入位置：

```text
items[].enrichment.localization[locale].name
items[].enrichment.localization[locale].description
items[].enrichment.localization[locale].freeTierText
```

导入后重新运行：

```bash
pnpm test
pnpm typecheck
pnpm build
```

维护者可用以下脚本做翻译质量自检：

```bash
node scripts/validate-free-for-dev-localizations.mjs
```

该脚本会按 5 种候选语言统计 `withLocale`、`completeLocaleFields`、`fullEnglishCopy`、`missing`。如出现 `fullEnglishCopy > 0`，说明某语言翻译存在英文透传（已视为未完成翻译）。

如果需要清理历史残留的英文透传本地化：

```bash
node scripts/clean-free-for-dev-localizations.mjs zh-CN ja ko fr es
```

它会移除指定语言中与英文源文本一致的 `enrichment.localization[locale]`。


## Prompt 生成

结构化服务优先：

```text
人工 config
→ 精准 setup URL
→ 精准 env keys
→ 精准 output format
→ 可校验和可测试
```

free-for-dev 候选服务走通用 prompt：

```text
normalized item
→ 通用 setup prompt
→ 告诉 Agent 先确认官网、免费层、API key / project settings
→ 禁止付款、升级、绕过 CAPTCHA/2FA
→ 最终只输出 KEY=VALUE
```

候选服务 prompt 必须包含：

- 服务名
- baipiao category
- sourceCategory
- homepage URL
- description
- freeTierText
- enrichment docs / console / apiKeys / pricing 候选 URL
- enrichment setupHints / envKeyHints
- source URL
- warnings
- 外部目录未结构化验证提示

## MCP

MCP 通过同一个 core prompt engine 生成提示词。

```json
{
  "tool": "generate_setup_prompt",
  "arguments": {
    "serviceId": "free-for-dev:generative-ai:some-service"
  }
}
```

返回结构：

```json
{
  "serviceId": "free-for-dev:generative-ai:some-service",
  "serviceName": "Some Service",
  "mode": "generic",
  "source": {
    "id": "free-for-dev"
  },
  "reviewStatus": "needs_review",
  "requiredEnvKeys": [],
  "capability": ["prompt"],
  "outputFormat": "KEY=VALUE",
  "prompt": "..."
}
```

MCP 不返回密钥明文，不提供 `vault_reveal`，不控制浏览器，不执行 shell。
