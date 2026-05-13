# MCP

MCP 是给外部 AI 编程工具（Claude Code、Cursor、Codex）暴露 `baipiao` 核心能力的协议层。所有 tool 走 allowlist 机制，显式禁止危险操作。

## 常用命令

安装 CLI，并把 baipiao 注册到你的 MCP 客户端：

```bash
# 安装 CLI
npm install -g baipiao

# 安装 Cursor 的 MCP 配置
baipiao mcp install cursor

# 安装 Claude Code 的 MCP 配置
baipiao mcp install claude

# 安装 Codex 的 MCP 配置
baipiao mcp install codex
```

Codex 最小接入：

```bash
# stdio，最常用
baipiao mcp install codex
```

可复制的手动配置 map：

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

如果你想走本机 HTTP MCP：

```bash
# 安装本机 HTTP MCP 地址
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

常用 MCP 调用形态：

```text
# 默认搜索全量白嫖大 JSON，支持模糊搜索
mcp: list_services { "query": "openruter", "limit": 20 }

# 需要指定语言、分页或 sourceCategory 时
mcp: list_free_catalog_candidates { "query": "openrouter", "locale": "zh-CN", "limit": 20 }

# 给某个服务生成 Agent 配置提示词
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

# 查看当前项目状态
mcp: get_status {}
```

## 启动方式

```bash
baipiao mcp                # stdio 模式（默认）
baipiao mcp --dry-run      # 仅检查可用性
baipiao mcp --port 7331    # 本机 HTTP MCP server
baipiao mcp install cursor # 安装客户端配置
```

## 协议兼容性

MCP server 支持当前客户端常用的标准 JSON-RPC 生命周期：

- `initialize` 会返回协商后的 protocol version、tools capability 和 `baipiao-mcp` server info。
- `notifications/initialized` 和其他 notification 会被接受，不会产生 JSON-RPC error response。
- `ping` 返回空的成功结果。
- HTTP 模式下，仅包含 notification 的请求返回 `202` 和空 body，而不是 JSON-RPC error payload。

## 安全声明

**MCP 不暴露以下接口：**

`vault_reveal`、`get_secret_value`、`browser_click`、`browser_type`、`shell_exec`、`read_any_file`、`write_any_file`、`delete_file`、`upload_secret`

这意味着：
- 不会返回 Vault 明文给外部模型
- 不会提供任意文件读写权限
- 不会让模型执行任意 shell 或浏览器操作

**Tool 安全标注：**

| 标注 | 说明 |
| --- | --- |
| 🔒 `readOnly` | 只读，不修改任何状态 |
| ⚡ `idempotent` | 可重复调用，幂等 |
| ⚠️ `destructive` | 会修改或删除数据 |

---

## list_services

搜索全量 `free-for-dev` 白嫖大 JSON，支持按关键词、分类和能力筛选。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query` | `string` | 否 | 搜索关键词、分类词或拼写近似词 |
| `category` | `string` | 否 | 按分类筛选 |
| `capability` | `"prompt" \| "config" \| "test"` | 否 | 按能力标签筛选 |
| `limit` | `number` | 否 | 返回数量上限 |

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

按关键字、分类、source-category、语言、limit、offset 查询全量 `free-for-dev` 候选目录。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query` | `string` | 否 | 搜索关键字 |
| `category` | `string` | 否 | 按归一化分类过滤 |
| `sourceCategory` | `string` | 否 | 按上游 Markdown 分区过滤 |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | 否 | 输出语言 |
| `systemLocale` | `string` | 否 | 主机环境语言提示 |
| `limit` | `number` | 否 | 最大返回数量 |
| `offset` | `number` | 否 | 分页偏移 |

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

返回全量候选目录的分类与 source-category 统计。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `locale` | `"en" \| "zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | 否 | 标签语言提示 |

## get_free_catalog_translation_batch

返回某个语言下未完整本地化候选项的源文本。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | 是 | 目标语言 |
| `query` | `string` | 否 | 搜索关键字 |
| `category` | `string` | 否 | 按归一化分类过滤 |
| `sourceCategory` | `string` | 否 | 按上游 Markdown 分区过滤 |
| `limit` | `number` | 否 | 最大返回数量 |
| `offset` | `number` | 否 | 分页偏移 |
| `untranslatedOnly` | `boolean` | 否 | 只返回未完整本地化的条目 |

## apply_free_catalog_translations

把离线翻译写回 `enrichment.localization`。⚡ `idempotent`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `locale` | `"zh-CN" \| "ja" \| "ko" \| "fr" \| "es"` | 是 | 目标语言 |
| `translations` | `array` | 是 | 翻译条目，包含 `id`、`name?`、`description?`、`freeTierText?` |

**Output**

```json
{
  "updated": 12,
  "missing": ["free-for-dev:generative-ai:missing-item"]
}
```

## get_service_info

获取指定服务的完整元数据。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 是 | 服务 id 或 slug |

**Output**

```json
{
  "service": {
    "id": "groq",
    "name": "Groq",
    "slug": "groq",
    "category": "llm",
    "description": "提供白嫖/部分白嫖方案的快速 LLM 推理 API。",
    "urls": {
      "homepage": "https://groq.com",
      "console": "https://console.groq.com",
      "apiKeys": "https://console.groq.com/keys",
      "docs": "https://console.groq.com/docs"
    },
    "freeTier": {
      "summary": "白嫖/部分白嫖，对支持的模型有速率限制。",
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
      "速率限制按模型生效",
      "上线前先确认当前是否仍有白嫖/部分白嫖可用"
    ]
  }
}
```

## generate_setup_prompt

为指定服务生成 Agent 配置提示词。结构化服务返回精准提示词，非结构化服务返回通用模板。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 是 | 服务 id 或 slug |
| `projectSlug` | `string` | 否 | 项目标识，用于提示词内命名 |

**Output**

```json
{
  "serviceId": "groq",
  "serviceName": "Groq",
  "prompt": "你是我的浏览器设置助手。\n\n目标：\n帮我配置 Groq 的白嫖/部分白嫖资源...\n\n完成后只输出：\nGROQ_API_KEY=...",
  "outputFormat": "GROQ_API_KEY=...",
  "requiredEnvKeys": ["GROQ_API_KEY"],
  "capability": ["prompt", "config", "test"]
}
```

## parse_agent_output

解析 Agent 返回的文本，提取 KEY=VALUE 条目。不持久化。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | 是 | Agent 返回的原始文本 |
| `serviceId` | `string` | 否 | 关联服务 id，用于格式校验和字段映射 |

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

解析失败时：

```json
{
  "entries": [],
  "notes": [],
  "warnings": [
    "Line 3 could not be parsed: 'some invalid text'"
  ]
}
```

**支持的输入格式**

- 环境变量格式：`KEY=VALUE`
- Markdown fenced code block
- 冒号格式：`API Key: abc`、`Endpoint: https://example.com`

## save_agent_output

解析 Agent 输出并持久化到 Vault。⚡ `idempotent`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 是 | 服务 id 或 slug |
| `text` | `string` | 是 | Agent 返回的原始文本 |

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

部分失败时：

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

校验单个 key 的值格式，并返回匹配的服务列表。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `key` | `string` | 是 | 环境变量 key 名 |
| `value` | `string` | 是 | 待校验的值 |

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

列出 Vault 中所有 key 的元数据。**不返回明文值。** 🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 否 | 按服务过滤 |

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

保存单个密钥。值与输入不回传。⚡ `idempotent`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `key` | `string` | 是 | 环境变量 key 名 |
| `value` | `string` | 是 | 待保存的值（不回传） |
| `serviceId` | `string` | 否 | 关联服务 id |

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

批量导入 KEY=VALUE，自动解析、校验、入库。⚡ `idempotent`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | 是 | 多行 KEY=VALUE 文本 |
| `serviceId` | `string` | 否 | 关联服务 id |

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

复制指定 key 的值到剪贴板。**不通过 MCP 回传值。** ⚡ `idempotent`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `key` | `string` | 是 | 待复制的 key 名 |

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

从系统密钥管理器删除指定 key。⚠️ `destructive`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `key` | `string` | 是 | 待删除的 key 名 |

**Output**

```json
{
  "removed": true,
  "key": "GROQ_API_KEY"
}
```

## vault_health

检查所有已存储 key 的健康状态。🔒 `readOnly`

**Input**

无

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

从 Vault 生成环境变量文件。⚠️ `destructive`（会写入文件系统）

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `path` | `string` | 否 | 目标文件路径，默认 `.env.local` |
| `example` | `boolean` | 否 | 生成 `.env.example`（仅 key 名） |
| `includeUnverified` | `boolean` | 否 | 包含未验证配置 |

**Output**

```json
{
  "path": ".env.local",
  "writtenKeys": ["GROQ_API_KEY", "GEMINI_API_KEY", "SUPABASE_URL"],
  "missingKeys": ["OPENROUTER_API_KEY"]
}
```

## test_connection

对指定服务执行连接测试。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `serviceId` | `string` | 是 | 服务 id 或 slug |

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
  "serviceId": "huggingface",
  "ok": false,
  "status": "skipped",
  "message": "Service does not support automated testing",
  "latencyMs": null
}
```

## get_status

获取当前项目全局状态摘要。🔒 `readOnly`

**Input**

无

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

按项目类型推荐白嫖技术栈。🔒 `readOnly`

**Input**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `useCase` | `"ai_saas" \| "rag" \| "blog" \| "agent_tool" \| "mobile_app" \| "custom"` | 是 | 项目类型 |

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
      "所有服务都支持白嫖/部分白嫖",
      "先配置 groq - 其他服务可能依赖认证流程"
    ]
  }
}
```

## 工具总览

| Tool | 类型 | 说明 |
| --- | --- | --- |
| `list_services` | 🔒 readOnly | 搜索服务目录 |
| `get_service_info` | 🔒 readOnly | 获取服务详情 |
| `generate_setup_prompt` | 🔒 readOnly | 生成 Agent 配置提示词 |
| `parse_agent_output` | 🔒 readOnly | 解析 Agent 输出 |
| `save_agent_output` | ⚡ idempotent | 保存 Agent 输出到 Vault |
| `validate_secret` | 🔒 readOnly | 校验密钥格式 |
| `vault_list` | 🔒 readOnly | 列出 Vault 元数据 |
| `vault_set` | ⚡ idempotent | 保存单个密钥 |
| `vault_import` | ⚡ idempotent | 批量导入密钥 |
| `vault_copy` | ⚡ idempotent | 复制密钥到剪贴板 |
| `vault_remove` | ⚠️ destructive | 删除密钥 |
| `vault_health` | 🔒 readOnly | 密钥健康检查 |
| `generate_env` | ⚠️ destructive | 写入 env 文件 |
| `test_connection` | 🔒 readOnly | 测试服务连接 |
| `get_status` | 🔒 readOnly | 项目状态摘要 |
| `recommend_stack` | 🔒 readOnly | 推荐技术栈 |

## 安装方式

### Cursor

```bash
baipiao mcp install cursor
```

输出：

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

输出：

```json
{
  "client": "claude",
  "transport": "http",
  "url": "http://127.0.0.1:7331/mcp",
  "localOnly": true
}
```

> 使用 `baipiao mcp --port 7331` 启动 HTTP server，再使用 `baipiao mcp install <client> --port 7331` 安装匹配的客户端配置。

## 典型调用示例

```text
1) 搜索 LLM 服务
mcp: list_services { "query": "llm", "capability": "config", "limit": 10 }

2) 获取 Groq 详情
mcp: get_service_info { "serviceId": "groq" }

3) 生成提示词
mcp: generate_setup_prompt { "serviceId": "groq", "projectSlug": "my-ai-tool" }

4) 保存 Agent 输出
mcp: save_agent_output {
  "serviceId": "groq",
  "text": "GROQ_API_KEY=gsk_xxx"
}

5) 检查状态
mcp: get_status {}

6) 生成 env
mcp: generate_env { "example": false }
```
