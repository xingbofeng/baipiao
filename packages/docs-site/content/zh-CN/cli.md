# CLI

`baipiao` 的命令行入口。每个命令可独立运行，也能串成完整配置链路。

## 常用命令

安装并跑通第一个服务：

```bash
# 安装 CLI
npm install -g baipiao

# 初始化当前项目
baipiao init --name my-ai-tool

# 默认搜索全量白嫖大 JSON，支持模糊搜索和语言识别
baipiao search llm

# 拼写不准也能搜到 OpenRouter
baipiao search openruter

# 生成配置提示词并接收 Agent 输出
baipiao setup groq

# 从 Vault 生成 .env.local
baipiao env generate

# 测试 Groq 连接
baipiao test groq
```

需要表格、分页、指定语言时再用 catalog candidates：

```bash
# 按关键词搜索全量候选库
baipiao catalog candidates --query openrouter

# 按归一化类型过滤
baipiao catalog candidates --category llm

# 按语言返回候选字段
baipiao catalog candidates --locale zh-CN
```

## init

```text
baipiao init [--name <name>]
```

初始化项目上下文，创建 `.baipiao/` 目录骨架。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--name` | `<string>` | 项目名称，同时作为 slug 使用。未指定时从当前目录名推断 |

**输出**

```text
✓ Initialized baipiao in /home/user/my-ai-tool
  Created .baipiao/project.json
  Created .baipiao/services.json
  Created .env.local
  Created .env.example
```

项目已存在时：

```text
⚠ Project already initialized at /home/user/my-ai-tool
```

**示例**

```bash
baipiao init
baipiao init --name my-ai-tool
```

## search

```text
baipiao search <query>
```

搜索全量 `free-for-dev` 白嫖大 JSON，支持模糊搜索、分类词、服务名和多语言关键词。这个命令默认不再只查少量内置服务。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<query>` | `string` | 搜索关键词。支持分类词（`llm`、`database`、`storage`、`hosting`）、服务名、拼写近似词和中文/日文/韩文/法文/西班牙文关键词 |

**输出**

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

能力标签含义：

| 标签 | 说明 |
| --- | --- |
| `prompt` | 可生成 Agent 配置提示词 |
| `config` | 可识别 key/env 并保存到 Vault |
| `test` | 可自动测试连接 |

**示例**

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

完整的 `free-for-dev` 候选查询与离线本地化流程。`candidates` 返回全量 normalized catalog 并支持关键字/分类过滤；`categories` 返回分类统计；`translation-batch` 导出待翻译字段；`localize` 将翻译写回 `enrichment.localization`。

支持的语言：

| 语言 | 含义 |
| --- | --- |
| `en` | 英文源文本 |
| `zh-CN` | 简体中文 |
| `ja` | 日文 |
| `ko` | 韩文 |
| `fr` | 法文 |
| `es` | 西班牙语 |

**示例**

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

查看服务详情，包括链接、env 字段、白嫖/部分白嫖、风险提示。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<service>` | `string` | 服务 id 或 slug（如 `groq`、`openrouter`、`supabase`） |

**输出**

```text
Groq

  Category    llm
  Homepage    https://groq.com
  Console     https://console.groq.com
  API Keys    https://console.groq.com/keys
  Docs        https://console.groq.com/docs

  白嫖/部分白嫖
  白嫖/部分白嫖，对支持的模型有速率限制。
  Requires credit card: No
  Reset cycle: daily

  Environment Variables
  GROQ_API_KEY (secret, required)
    Pattern: ^gsk_[A-Za-z0-9]+$

  Capabilities
  prompt  config  test

  Risks
  • 速率限制按模型生效
  • 上线前先确认当前是否仍有白嫖/部分白嫖可用
```

**示例**

```bash
baipiao info groq
baipiao info supabase
```

## prompt

```text
baipiao prompt <service> [--copy]
```

为指定服务生成 Agent 配置提示词。结构化服务（有 YAML 配置）生成精准提示词，非结构化服务生成通用模板。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<service>` | `string` | 服务 id 或 slug |
| `--copy` | `boolean` | 生成后将提示词复制到系统剪贴板 |

**输出**（结构化服务，Groq 示例）

```text
你是我的浏览器设置助手。

目标：
帮我配置 Groq 的白嫖/部分白嫖资源，并创建所需的
API key。

入口页面：
https://console.groq.com/keys

步骤：
1. 如果还没有登录，请暂停并让我先完成登录、验证码、
   邮箱验证或 2FA。
2. 创建一个新的 API key。
3. 使用 baipiao-${project_slug} 作为名称。
4. 复制生成的 API key。

安全规则：
• 不要向我索要或保存网页登录密码。
• 不要绕过验证码、2FA、手机验证或平台风控。
• 不要点击 Billing、Upgrade、Payment、Subscribe 或添加付款方式。
• 不要启用任何付费功能。

完成后只输出：
GROQ_API_KEY=...
```

**示例**

```bash
baipiao prompt groq
baipiao prompt groq --copy
baipiao prompt huggingface # 解析到 huggingface.co 白嫖目录候选
```

## setup

```text
baipiao setup <service>
```

交互式完成服务配置全流程：生成提示词 → 等待 Agent 输出 → 解析 → 校验 → 入库 → 写 env → 测试。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<service>` | `string` | 服务 id 或 slug |

**交互流程**

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

**状态流转**

```text
not_started → prompt_generated → agent_output_received
  → configured_unverified → configured → tested
```

**示例**

```bash
baipiao setup groq
baipiao setup supabase
```

## output

```text
baipiao output <service> [--input <text>]
```

与 `setup` 同一入口，用于从外部来源导入 Agent 输出。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<service>` | `string` | 服务 id 或 slug |
| `--input` | `<string>` | 直接传入 KEY=VALUE 文本，跳过交互式粘贴 |

**支持的输入格式**

- 环境变量格式：`KEY=VALUE`
- Markdown 代码块：
  ````text
  ```env
  GROQ_API_KEY=gsk_xxx
  ```
  ````
- 冒号格式：`API Key: abc`、`Endpoint: https://example.com`

**示例**

```bash
baipiao output groq
baipiao output groq --input "GROQ_API_KEY=gsk_xxx"
```

## env generate

```text
baipiao env generate [--example] [--include-unverified]
```

从 Vault 读取已保存配置，生成环境变量文件。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--example` | `boolean` | 生成 `.env.example`（仅 key 名，不含真实值） |
| `--include-unverified` | `boolean` | 包含未验证配置，并打印风险提示 |

**输出**

```text
$ baipiao env generate
✓ .env.local written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

$ baipiao env generate --example
✓ .env.example written
  Keys: GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
```

**示例**

```bash
baipiao env generate
baipiao env generate --example
baipiao env generate --include-unverified
```

## test

```text
baipiao test [<service>]
```

测试服务连接。不指定服务时，测试当前项目所有已跟踪服务。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<service>` | `string` | 可选。服务 id 或 slug |

**输出**

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

**支持的测试类型**

| 类型 | 说明 |
| --- | --- |
| `openai_compatible_chat` | 发送 chat completion 请求验证 API Key（Groq、OpenRouter） |
| `http` | HTTP GET/POST 请求验证（Gemini） |
| `supabase` | 验证 Supabase URL + Anon Key |
| `s3_compatible` | 验证 S3 兼容存储连接（Cloudflare R2） |

**示例**

```bash
baipiao test
baipiao test groq
baipiao test supabase
```

## status

```text
baipiao status
```

汇总当前项目的全局状态。

**输出**

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

**示例**

```bash
baipiao status
```

## stack recommend

```text
baipiao stack recommend <type>
```

按项目类型推荐白嫖技术栈。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | 项目类型 |

**输出**

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

**示例**

```bash
baipiao stack recommend ai_saas
baipiao stack recommend rag
baipiao stack recommend blog
```

## setup-stack

```text
baipiao setup-stack <type>
```

为推荐栈中每个服务逐个输出 setup 提示词片段。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<type>` | `ai_saas \| rag \| blog \| agent_tool \| mobile_app \| custom` | 项目类型 |

**示例**

```bash
baipiao setup-stack ai_saas
```

## vault

```text
baipiao vault [<subcommand>]
```

统一密钥管理中心。不指定子命令时打开 Vault 总览。

**子命令**

### vault list

```text
baipiao vault list [--service <service>]
```

列出所有 key 状态，不显示明文。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--service` | `<string>` | 可选。按服务过滤 |

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
baipiao vault set <KEY> [--service <service>]
```

手动保存单个密钥。输入不回显。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<KEY>` | `string` | 环境变量 key 名 |
| `--service` | `<string>` | 可选。关联的服务 id |

```text
$ baipiao vault set GROQ_API_KEY
Enter value for GROQ_API_KEY: ********
✓ GROQ_API_KEY saved to Vault
✓ Matched service: groq
```

### vault import

```text
baipiao vault import [--service <service>]
```

批量导入 KEY=VALUE 文本，自动解析、校验、入库。

```text
$ baipiao vault import
Paste KEY=VALUE lines (end with empty line):
GROQ_API_KEY=gsk_xxx
GEMINI_API_KEY=xxx

✓ Parsed 2 entries
✓ GROQ_API_KEY saved
✓ GEMINI_API_KEY saved
```

### vault copy

```text
baipiao vault copy <KEY>
```

复制指定 key 的值到剪贴板。终端不打印明文。

```text
$ baipiao vault copy GROQ_API_KEY
✓ GROQ_API_KEY copied to clipboard
✓ Clipboard will be cleared in 30 seconds
```

### vault reveal

```text
baipiao vault reveal <KEY>
```

在终端显示明文。**必须二次确认。** MCP 不提供此接口。

```text
$ baipiao vault reveal GROQ_API_KEY
This will print the secret value in your terminal. Continue? y/N
```

### vault remove

```text
baipiao vault remove <KEY>
```

从系统密钥管理器删除指定 key。

```text
$ baipiao vault remove GROQ_API_KEY
✓ GROQ_API_KEY removed from Vault
⚠ This key still appears in .env.local. Remove it? y/N
```

### vault health

```text
baipiao vault health
```

检查所有 key 的状态与格式。

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
```

启动 MCP stdio server，供 AI 编程工具调用。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--dry-run` | `boolean` | 仅检查可用性，不实际启动 server |

**示例**

```bash
baipiao mcp
baipiao mcp --dry-run
```

## mcp install

```text
baipiao mcp install <client> [--port <port>]
```

把 baipiao 安装到目标 MCP 客户端。命令会直接更新客户端配置：

- Cursor：写入 `~/.cursor/mcp.json`
- Claude Code：执行 `claude mcp add --scope user ...`
- Codex：执行 `codex mcp add ...`

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `<client>` | `cursor \| claude \| codex` | 目标 AI 编程工具 |
| `--port` | `<number>` | 安装指向 `http://127.0.0.1:<port>/mcp` 的 HTTP 客户端配置 |

**手动配置 map**（stdio 模式）

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

**手动配置 map**（HTTP 模式）

```json
{
  "mcpServers": {
    "baipiao": {
      "url": "http://127.0.0.1:7331/mcp"
    }
  }
}
```

> 使用 `baipiao mcp --port 7331` 启动 HTTP server，再使用 `baipiao mcp install <client> --port 7331` 安装匹配的客户端配置。

**示例**

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex --port 7331
```

## 安全边界

- 不自动点击付款 / 升级 / 订阅
- 不保存用户网页登录密码
- 不绕过 CAPTCHA、2FA、手机验证或平台风控
- `vault list` 不显示明文，`vault copy` 用剪贴板代替终端输出
- MCP 不暴露 `vault_reveal`、`get_secret_value`、`shell_exec`、`browser_click` 等危险接口
- 日志和状态输出默认脱敏
