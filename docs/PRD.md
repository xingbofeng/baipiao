# 《baipiao》产品需求文档 PRD

> 项目名：baipiao  
> CLI 命令名：`baipiao`  
> 产品定位：开发者免费服务配置器  
> Slogan：让 Agent 配免费栈。  

---

## 1. 产品概述

### 1.1 一句话

**baipiao 是一个开发者免费服务配置器：搜索免费开发者服务，生成 Agent 可执行提示词，回收 Agent 输出的 Key 和配置，统一存入 Vault，生成 `.env`，测试连接，并通过 MCP 暴露给 AI 编程工具。**

### 1.2 完整定义

baipiao 面向独立开发者、学生开发者、开源作者、AI 原型开发者和使用 Codex / Claude Code / Cursor 的开发者。

它不负责自动注册账号，不负责控制浏览器，也不保存网页登录密码。它负责把“免费服务怎么配置”变成 Agent 可以执行的提示词，并在 Agent 完成网页操作后，接管结果管理。

核心流程：

```text
baipiao 生成 Agent 配置提示词
        ↓
用户粘贴给 Codex / Claude Code / Cursor / 浏览器 Agent
        ↓
Agent 去网页里注册、创建 API Key、复制配置
        ↓
用户把 Agent 输出的 KEY=VALUE 粘贴回 baipiao
        ↓
baipiao 解析、校验、保存到 Vault、生成 .env、测试连接
        ↓
通过 MCP 提供给 AI 编程工具使用
```

### 1.3 产品边界

只做一个版本：**全量版**。

全量版定义：

```text
所有收录服务都能搜索、查看、生成 Agent 配置提示词、纳入项目状态管理。
有结构化配置的服务，额外支持 Key 校验、Vault 保存、.env 生成、连接测试。
```

不拆免费版 / 专业版，不拆手动模式 / 浏览器模式 / 提示词模式。唯一主流程就是：

```text
生成提示词 → Agent 执行 → 回填输出 → Vault 管理 → env/test/MCP
```

---

## 2. 背景与问题

开发者做 MVP 时经常需要拼一套低成本技术栈：

- LLM API
- 对象存储
- 数据库
- Hosting
- Auth
- Email
- Monitoring
- Vector DB
- Queue
- Analytics

现实问题：

1. 不知道有哪些服务可以免费用。
2. 找到服务后，不知道具体在哪里创建 API Key。
3. API Key、Endpoint、Project ID、Bucket Name 到处散落。
4. `.env.local` 手写容易错。
5. 不知道哪些 Key 可以给前端，哪些只能放后端。
6. 不知道 Key 是否有效。
7. 使用 Agent 时，需要反复告诉 Agent：去哪里注册、不要点付款、输出什么格式。
8. AI 编程工具无法统一感知本地项目的 API Key 状态。
9. 密钥管理没有统一入口。

baipiao 要解决的是：

```text
免费服务发现
+
Agent 配置任务生成
+
统一密钥中心
+
.env 生成
+
连接测试
+
MCP 工具化
```

---

## 3. 目标用户

### 3.1 核心用户

- 独立开发者
- 学生开发者
- 开源项目作者
- AI SaaS 原型开发者
- RAG / Agent 工具开发者
- 经常使用 Codex / Claude Code / Cursor 的开发者
- 想尽量用免费层搭 MVP 的开发者

### 3.2 用户画像

#### 用户 A：独立开发者

正在开发一个 AI 小工具，希望快速接入 Groq / OpenRouter / Gemini / Supabase / R2，不想手动整理一堆 Key。

#### 用户 B：学生开发者

预算有限，希望知道哪些服务免费，配置后能直接生成 `.env.local` 跑项目。

#### 用户 C：AI 编程重度用户

主要使用 Codex / Claude Code / Cursor，希望通过 MCP 让 Agent 获取服务配置提示词和项目密钥状态。

#### 用户 D：开源作者

希望项目 README 里可以推荐一组免费栈，并用 `baipiao setup-stack ai-basic` 快速接入。

---

## 4. 设计原则

### 4.1 Prompt-first

baipiao 不直接控制浏览器，而是生成高质量、带安全边界、带输出格式的 Agent 提示词。

### 4.2 MCP-first

baipiao 所有核心能力都要能通过 MCP 暴露给 Agent：

- 搜索服务
- 获取服务详情
- 生成提示词
- 解析 Agent 输出
- 保存密钥
- 生成 env
- 测试连接
- 查看状态

### 4.3 Vault-first

API Key、Token、Secret 是一级模块，不只是 setup 的副产品。

必须有统一密钥中心：

```bash
baipiao vault
baipiao vault list
baipiao vault set
baipiao vault import
baipiao vault copy
baipiao vault remove
baipiao vault health
```

### 4.4 安全优先

绝不保存网页登录密码，绝不绕过验证码，绝不引导批量注册小号，绝不自动点击付款、升级、订阅、添加支付方式。

### 4.5 全量覆盖，能力降级

所有服务都能生成通用 Agent 提示词；有结构化配置的服务才支持校验和测试。

---

## 5. 非目标

baipiao v1 不做：

```text
网页 UI
桌面 App
浏览器插件
浏览器自动化
自动注册账号
自动处理验证码
自动处理 2FA
批量注册小号
保存网页登录密码
云端同步
付费账单读取
```

---

## 6. 核心功能

### 6.1 免费服务目录

用户可以搜索免费开发者服务。

```bash
baipiao search llm
baipiao search database
baipiao search storage
baipiao search hosting
```

输出示例：

```text
Groq              configurable / testable
OpenRouter        configurable / testable
Gemini            configurable / testable
Hugging Face      prompt-ready
Together AI       prompt-ready
```

服务能力分级：

```ts
type ServiceCapability = "prompt" | "config" | "test"
```

解释：

```text
prompt：可生成 Agent 配置提示词
config：可识别 key/env，并保存配置
test：可自动测试连接
```

所有服务至少支持 `prompt`。

---

### 6.2 服务详情

```bash
baipiao info groq
```

展示：

- 服务名称
- 分类
- 官网 / Console / API Key 页面
- 免费说明
- 需要的 env key
- 是否可配置
- 是否可测试
- 安全提醒

---

### 6.3 Agent 提示词生成

```bash
baipiao prompt groq
```

对于结构化服务，生成精准提示词：

```text
Open https://console.groq.com/keys
Create a new API key
Use the name baipiao-${project_slug}
Output:
GROQ_API_KEY=...
```

对于普通服务，生成通用提示词：

```text
Open the service website.
Find Sign up / Dashboard / API Key / Project Settings.
Do not click Billing / Upgrade / Payment.
Output configuration as KEY=VALUE.
```

---

### 6.4 Setup 主流程

```bash
baipiao setup groq
```

流程：

```text
查找服务
生成提示词
复制到剪贴板
等待用户粘贴 Agent 输出
解析 KEY=VALUE
校验格式
保存 Vault
写入 .env.local
执行连接测试
更新服务状态
```

状态流转：

```text
not_started
→ prompt_generated
→ agent_output_received
→ configured / configured_unverified
→ tested
```

---

### 6.5 Agent 输出解析

支持：

```env
GROQ_API_KEY=gsk_xxx
```

支持 Markdown code block：

````md
```env
GROQ_API_KEY=gsk_xxx
```
````

支持冒号格式：

```text
API Key: abc123
Endpoint: https://api.example.com
Project ID: proj_123
```

转换为：

```env
SERVICE_API_KEY=abc123
SERVICE_ENDPOINT=https://api.example.com
SERVICE_PROJECT_ID=proj_123
```

---

## 7. Vault：统一 API Key 管理中心

### 7.1 产品定位

Vault 是 baipiao 的统一密钥中心。

它集中管理：

- API Key
- Access Token
- Secret
- Endpoint
- Project ID
- Bucket Name
- Database URL
- Connection String

Vault 不是简单的 secret list，而是用户可以感知的一级功能。

### 7.2 Vault 命令

#### 打开 Vault

```bash
baipiao vault
```

输出示例：

```text
baipiao Vault

Service          Key                         Status     Scope       Test
Groq             GROQ_API_KEY                stored     server      passed
OpenRouter       OPENROUTER_API_KEY          missing    server      -
Gemini           GEMINI_API_KEY              stored     server      passed
Supabase         SUPABASE_URL                stored     public      passed
Supabase         SUPABASE_ANON_KEY           stored     public      passed
Supabase         SUPABASE_SERVICE_ROLE_KEY   stored     server      warning
Cloudflare R2    R2_SECRET_ACCESS_KEY        stored     server      passed
```

#### 查看密钥状态

```bash
baipiao vault list
```

不显示明文，只显示：

```text
GROQ_API_KEY                  stored
OPENROUTER_API_KEY            missing
GEMINI_API_KEY                stored
SUPABASE_SERVICE_ROLE_KEY     stored / server-only
R2_SECRET_ACCESS_KEY          stored
```

#### 保存密钥

```bash
baipiao vault set GROQ_API_KEY
baipiao vault set GROQ_API_KEY --service groq
```

要求：

- 输入不回显
- 自动校验格式
- 自动关联服务
- 自动更新状态

#### 批量导入

```bash
baipiao vault import
```

用户粘贴：

```env
GROQ_API_KEY=gsk_xxx
OPENROUTER_API_KEY=sk-or-v1-xxx
GEMINI_API_KEY=xxx
```

系统：

```text
解析
校验
脱敏日志
保存到 Keychain
更新状态
```

#### 复制密钥

```bash
baipiao vault copy GROQ_API_KEY
```

输出：

```text
✓ GROQ_API_KEY copied to clipboard
✓ Clipboard will be cleared in 30 seconds
```

不在终端打印明文。

#### 显示明文

```bash
baipiao vault reveal GROQ_API_KEY
```

必须二次确认：

```text
This will print the secret value in your terminal. Continue? y/N
```

MCP 不允许 reveal。

#### 删除密钥

```bash
baipiao vault remove GROQ_API_KEY
```

行为：

- 从系统 Keychain 删除
- 更新服务状态
- 不自动改 `.env.local`
- 提示用户是否同步移除 env

#### 健康检查

```bash
baipiao vault health
```

输出：

```text
✓ GROQ_API_KEY              format valid / connection passed
! OPENROUTER_API_KEY        missing
✓ GEMINI_API_KEY            format valid / connection passed
! SUPABASE_SERVICE_ROLE_KEY server-only, do not expose to frontend
```

### 7.3 Vault 数据模型

```ts
type VaultEntry = {
  key: string
  serviceId?: string
  valueRef: string
  secret: boolean
  public: boolean
  required: boolean
  status: "stored" | "missing" | "invalid" | "untested"
  scope: "public" | "server" | "unknown"
  lastUpdatedAt?: string
  lastTestAt?: string
}
```

`valueRef` 不保存明文，只保存 Keychain 引用。

### 7.4 Vault 安全规则

- Secret 默认保存到系统密钥管理器
- macOS：Keychain
- Windows：Credential Manager
- Linux：Secret Service
- fallback：本地加密文件，但必须提示用户
- 日志必须脱敏
- MCP 不返回明文
- `.env.example` 不包含真实值

---

## 8. Env 管理

### 8.1 生成 `.env.local`

```bash
baipiao env generate
```

从 Vault 中读取已保存配置，写入 `.env.local`。

### 8.2 生成 `.env.example`

```bash
baipiao env generate --example
```

只写 key 名，不写真实值。

### 8.3 未验证配置

```bash
baipiao env generate --include-unverified
```

允许把通用服务返回的未验证配置写入 env，但必须提示风险。

---

## 9. 连接测试

支持类型：

```ts
type ProviderTestSpec =
  | OpenAICompatibleChatTestSpec
  | HttpTestSpec
  | SupabaseTestSpec
  | S3CompatibleTestSpec
  | ManualTestSpec
```

### 9.1 OpenAI Compatible

用于 Groq、OpenRouter 等。

```ts
type OpenAICompatibleChatTestSpec = {
  type: "openai_compatible_chat"
  baseUrl: string
  envKey: string
  modelHint?: string
}
```

### 9.2 HTTP Test

用于 Gemini 这类 HTTP 检查。

```ts
type HttpTestSpec = {
  type: "http"
  method: "GET" | "POST"
  url: string
  headers?: Record<string, string>
  body?: unknown
  expectedStatus?: number
}
```

### 9.3 Supabase Test

```ts
type SupabaseTestSpec = {
  type: "supabase"
  urlEnvKey: string
  anonKeyEnvKey: string
}
```

### 9.4 S3 Compatible Test

用于 Cloudflare R2。

```ts
type S3CompatibleTestSpec = {
  type: "s3_compatible"
  endpointEnvKey: string
  accessKeyEnvKey: string
  secretKeyEnvKey: string
  bucketEnvKey: string
}
```

---

## 10. MCP

### 10.1 启动

```bash
baipiao mcp
baipiao mcp --stdio
baipiao mcp --port 7331
```

默认使用 stdio。

### 10.2 安装配置

```bash
baipiao mcp install cursor
baipiao mcp install claude
baipiao mcp install codex
```

输出或写入 MCP 配置：

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

### 10.3 MCP 安全边界

MCP 不暴露：

```text
browser.click
browser.type
shell.exec 任意命令
读取任意文件
删除文件
上传密钥
返回密钥明文
```

MCP 暴露：

```text
服务查询
服务详情
提示词生成
Agent 输出解析
Vault 保存
env 生成
连接测试
状态查询
```

---

## 11. CLI 命令总表

```bash
baipiao init
baipiao search <query>
baipiao info <service>
baipiao prompt <service>
baipiao setup <service>
baipiao setup-stack <stack>
baipiao output <service>
baipiao vault
baipiao vault list
baipiao vault set <KEY>
baipiao vault import
baipiao vault copy <KEY>
baipiao vault reveal <KEY>
baipiao vault remove <KEY>
baipiao vault health
baipiao env generate
baipiao test [service]
baipiao status
baipiao stack recommend <type>
baipiao mcp
baipiao mcp install <client>
```

---

## 12. MCP Tool 接口

### 12.1 `list_services`

```ts
type ListServicesInput = {
  query?: string
  category?: string
  capability?: ServiceCapability
  limit?: number
}

type ListServicesOutput = {
  services: ServiceSummary[]
}
```

### 12.2 `get_service_info`

```ts
type GetServiceInfoInput = {
  serviceId: string
}

type GetServiceInfoOutput = {
  service: ServiceInfo
}
```

### 12.3 `generate_setup_prompt`

```ts
type GenerateSetupPromptInput = {
  serviceId: string
  projectSlug?: string
}

type GenerateSetupPromptOutput = {
  serviceId: string
  serviceName: string
  prompt: string
  outputFormat: string
  requiredEnvKeys: string[]
  capability: ServiceCapability[]
}
```

### 12.4 `parse_agent_output`

```ts
type ParseAgentOutputInput = {
  serviceId?: string
  text: string
}

type ParseAgentOutputOutput = {
  entries: EnvEntry[]
  notes: string[]
  warnings: string[]
}
```

### 12.5 `save_agent_output`

```ts
type SaveAgentOutputInput = {
  serviceId: string
  text: string
}

type SaveAgentOutputOutput = {
  saved: SavedEntry[]
  failed: FailedEntry[]
  state: ServiceState
}
```

### 12.6 `validate_secret`

```ts
type ValidateSecretInput = {
  key: string
  value: string
}

type ValidateSecretOutput = {
  valid: boolean
  key: string
  serviceIds: string[]
  reason?: string
}
```

### 12.7 Vault MCP Tools

```ts
vault_list(): VaultListOutput

vault_set(input: {
  key: string
  value: string
  serviceId?: string
}): VaultSetOutput

vault_import(input: {
  text: string
  serviceId?: string
}): VaultImportOutput

vault_copy(input: {
  key: string
}): VaultCopyOutput

vault_remove(input: {
  key: string
}): VaultRemoveOutput

vault_health(): VaultHealthOutput
```

MCP 禁止：

```ts
vault_reveal()
```

不提供 reveal 明文接口。

### 12.8 `generate_env`

```ts
type GenerateEnvInput = {
  path?: string
  example?: boolean
  includeUnverified?: boolean
}

type GenerateEnvOutput = {
  path: string
  writtenKeys: string[]
  missingKeys: string[]
}
```

### 12.9 `test_connection`

```ts
type TestConnectionInput = {
  serviceId: string
}

type TestConnectionOutput = {
  serviceId: string
  ok: boolean
  status: "passed" | "failed" | "skipped"
  message?: string
  latencyMs?: number
}
```

### 12.10 `get_status`

```ts
type GetStatusInput = {}

type GetStatusOutput = ProjectStatus
```

### 12.11 `recommend_stack`

```ts
type RecommendStackInput = {
  useCase: ProjectType
}

type RecommendStackOutput = {
  stack: RecommendedStack
}
```

---

## 13. 数据模型

### 13.1 ProjectType

```ts
type ProjectType =
  | "ai_saas"
  | "rag"
  | "blog"
  | "agent_tool"
  | "mobile_app"
  | "custom"
```

### 13.2 ServiceCapability

```ts
type ServiceCapability = "prompt" | "config" | "test"
```

### 13.3 ServiceState

```ts
type ServiceState =
  | "not_started"
  | "prompt_generated"
  | "agent_output_received"
  | "configured_unverified"
  | "configured"
  | "tested"
  | "failed"
```

### 13.4 ServiceRecord

```ts
type ServiceRecord = {
  id: string
  name: string
  slug: string
  category: string
  description?: string
  url?: string
  tags?: string[]
  capability: ServiceCapability[]
  source?: {
    name: string
    url?: string
    importedAt?: string
  }
  config?: ServiceConfigSpec
}
```

### 13.5 ServiceConfigSpec

```ts
type ServiceConfigSpec = {
  urls?: ProviderUrls
  freeTier?: FreeTierInfo
  env?: EnvVarSpec[]
  prompt?: ProviderPromptSpec
  test?: ProviderTestSpec
  risks?: string[]
}
```

### 13.6 EnvVarSpec

```ts
type EnvVarSpec = {
  key: string
  secret: boolean
  required: boolean
  pattern?: string
  description?: string
  public?: boolean
}
```

### 13.7 ProjectConfig

```ts
type ProjectConfig = {
  id: string
  name: string
  slug: string
  type: ProjectType
  createdAt: string
  updatedAt: string
  envPath: string
}
```

### 13.8 ProjectServiceRecord

```ts
type ProjectServiceRecord = {
  serviceId: string
  state: ServiceState
  envKeys: string[]
  configKeys: string[]
  lastPromptGeneratedAt?: string
  lastAgentOutputAt?: string
  lastSecretSavedAt?: string
  lastTestAt?: string
  lastError?: string
}
```

---

## 14. 本地文件

### 14.1 `.baipiao/project.json`

```json
{
  "id": "proj_01HX",
  "name": "my-ai-tool",
  "slug": "my-ai-tool",
  "type": "ai_saas",
  "createdAt": "2026-05-12T12:00:00.000Z",
  "updatedAt": "2026-05-12T12:00:00.000Z",
  "envPath": ".env.local"
}
```

### 14.2 `.baipiao/services.json`

```json
{
  "services": [
    {
      "serviceId": "groq",
      "state": "tested",
      "envKeys": ["GROQ_API_KEY"],
      "configKeys": [],
      "lastPromptGeneratedAt": "2026-05-12T12:00:00.000Z",
      "lastAgentOutputAt": "2026-05-12T12:03:00.000Z",
      "lastSecretSavedAt": "2026-05-12T12:03:01.000Z",
      "lastTestAt": "2026-05-12T12:03:04.000Z"
    }
  ]
}
```

### 14.3 `.baipiao/outputs/<service>.md`

保存 Agent 输出，默认脱敏：

````md
# Groq Agent Output

Status: tested  
SavedAt: 2026-05-12T12:03:00.000Z

```env
GROQ_API_KEY=gsk_***
```
````

### 14.4 `.env.local`

```env
GROQ_API_KEY=gsk_xxx
OPENROUTER_API_KEY=sk-or-v1-xxx
GEMINI_API_KEY=xxx
```

### 14.5 `.env.example`

```env
GROQ_API_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
```

---

## 15. 目录结构

```text
baipiao/
  package.json
  pnpm-workspace.yaml
  tsconfig.json
  README.md

  packages/
    cli/
      src/
        index.ts
        commands/
          init.ts
          search.ts
          info.ts
          prompt.ts
          setup.ts
          output.ts
          vault.ts
          env.ts
          test.ts
          status.ts
          stack.ts
          mcp.ts

    core/
      src/
        index.ts
        registry/
        prompt/
        parser/
        vault/
        env/
        tester/
        status/
        stack/
        errors/

    mcp-server/
      src/
        index.ts
        tools/

  registry/
    catalog/
      services.json
      categories.json
      metadata.json

    configs/
      groq.yaml
      openrouter.yaml
      gemini.yaml
      supabase.yaml
      cloudflare-r2.yaml
      vercel.yaml

  templates/
    prompts/
      generic-service.md
      configured-service.md
      stack.md

  docs/
    PRD.md
    API_AND_VAULT.md
    ARCHITECTURE.md
    assets/
      cli-four-panel-preview.png
```

---

## 16. 服务配置示例

### 16.1 Groq

```yaml
id: groq
name: Groq
category: llm
description: Fast LLM inference API with a free tier.

urls:
  homepage: https://groq.com
  console: https://console.groq.com
  apiKeys: https://console.groq.com/keys
  docs: https://console.groq.com/docs

freeTier:
  summary: Free tier with rate limits for supported models.
  requiresCreditCard: false
  resetCycle: daily
  confidence: medium

env:
  - key: GROQ_API_KEY
    secret: true
    required: true
    pattern: "^gsk_[A-Za-z0-9]+$"
    description: Groq API Key

prompt:
  goal: Create a Groq API key for the user's project.
  steps:
    - Open https://console.groq.com/keys
    - If not logged in, pause and ask the user to complete login, CAPTCHA, email verification, or 2FA.
    - Create a new API key.
    - Use the name baipiao-${project_slug}.
    - Copy the generated API key.
  safety:
    - Do not ask for or store the user's web login password.
    - Do not bypass CAPTCHA, 2FA, phone verification, or platform risk checks.
    - Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
    - Do not enable any paid feature.
  outputFormat: |
    GROQ_API_KEY=...

test:
  type: openai_compatible_chat
  baseUrl: https://api.groq.com/openai/v1
  envKey: GROQ_API_KEY
  modelHint: llama-3.1-8b-instant
```

### 16.2 OpenRouter

```yaml
id: openrouter
name: OpenRouter
category: llm
description: Router for many LLM providers and models.

urls:
  homepage: https://openrouter.ai
  console: https://openrouter.ai
  apiKeys: https://openrouter.ai/settings/keys
  docs: https://openrouter.ai/docs

freeTier:
  summary: Provides free model access with usage limits.
  requiresCreditCard: false
  resetCycle: daily
  confidence: medium

env:
  - key: OPENROUTER_API_KEY
    secret: true
    required: true
    pattern: "^sk-or-v1-[A-Za-z0-9_-]+$"
    description: OpenRouter API Key

prompt:
  goal: Create an OpenRouter API key for the user's project.
  steps:
    - Open https://openrouter.ai/settings/keys
    - If not logged in, pause and ask the user to complete login, CAPTCHA, email verification, or 2FA.
    - Create a new API key.
    - Use the name baipiao-${project_slug}.
    - Copy the generated API key.
  safety:
    - Do not ask for or store the user's web login password.
    - Do not bypass CAPTCHA, 2FA, phone verification, or platform risk checks.
    - Do not purchase credits.
    - Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
  outputFormat: |
    OPENROUTER_API_KEY=...

test:
  type: openai_compatible_chat
  baseUrl: https://openrouter.ai/api/v1
  envKey: OPENROUTER_API_KEY
  modelHint: openrouter/auto
```

### 16.3 Gemini

```yaml
id: gemini
name: Gemini API
category: llm
description: Google Gemini API.

urls:
  homepage: https://ai.google.dev
  console: https://aistudio.google.com
  apiKeys: https://aistudio.google.com/app/apikey
  docs: https://ai.google.dev/gemini-api/docs

freeTier:
  summary: Gemini API free tier with rate limits.
  requiresCreditCard: false
  resetCycle: daily
  confidence: medium

env:
  - key: GEMINI_API_KEY
    secret: true
    required: true
    pattern: "^[A-Za-z0-9_-]{20,}$"
    description: Gemini API Key

prompt:
  goal: Create a Gemini API key for the user's project.
  steps:
    - Open https://aistudio.google.com/app/apikey
    - If not logged in, pause and ask the user to complete Google login, CAPTCHA, email verification, or 2FA.
    - Create a new API key.
    - If asked to select or create a Google Cloud project, use a project name like baipiao-${project_slug}.
    - Copy the generated API key.
  safety:
    - Do not ask for or store the user's Google password.
    - Do not bypass CAPTCHA, 2FA, phone verification, regional checks, or platform risk checks.
    - Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
    - Do not enable paid Google Cloud services.
  outputFormat: |
    GEMINI_API_KEY=...

test:
  type: http
  method: GET
  url: "https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}"
  expectedStatus: 200
```

### 16.4 Supabase

```yaml
id: supabase
name: Supabase
category: database
description: Postgres, Auth, Storage, Realtime, and Edge Functions.

urls:
  homepage: https://supabase.com
  console: https://supabase.com/dashboard
  docs: https://supabase.com/docs

freeTier:
  summary: Free plan for Postgres, Auth, Storage, and Edge Functions with usage limits.
  requiresCreditCard: false
  resetCycle: monthly
  confidence: medium

env:
  - key: SUPABASE_URL
    secret: false
    public: true
    required: true
    pattern: "^https://[a-zA-Z0-9-]+\\.supabase\\.co$"

  - key: SUPABASE_ANON_KEY
    secret: true
    public: true
    required: true
    pattern: "^eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$"

  - key: SUPABASE_SERVICE_ROLE_KEY
    secret: true
    public: false
    required: false
    pattern: "^eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$"

prompt:
  goal: Create or configure a Supabase project and collect project API values.
  steps:
    - Open https://supabase.com/dashboard/projects
    - If not logged in, pause and ask the user to complete login, CAPTCHA, email verification, or 2FA.
    - Create a new project if the user does not already have one.
    - Use the project name baipiao-${project_slug}.
    - After the project is ready, open Project Settings > API.
    - Copy the Project URL.
    - Copy the anon public key.
    - If available and needed for server-side access, copy the service_role key.
  safety:
    - Do not ask for or store the user's web login password.
    - Do not bypass CAPTCHA, 2FA, phone verification, or platform risk checks.
    - Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
    - Do not enable any paid feature.
    - Do not expose SUPABASE_SERVICE_ROLE_KEY to frontend code.
  outputFormat: |
    SUPABASE_URL=...
    SUPABASE_ANON_KEY=...
    SUPABASE_SERVICE_ROLE_KEY=...

test:
  type: supabase
  urlEnvKey: SUPABASE_URL
  anonKeyEnvKey: SUPABASE_ANON_KEY
```

### 16.5 Cloudflare R2

```yaml
id: cloudflare-r2
name: Cloudflare R2
category: object_storage
description: S3-compatible object storage.

urls:
  homepage: https://www.cloudflare.com/developer-platform/products/r2/
  console: https://dash.cloudflare.com
  docs: https://developers.cloudflare.com/r2/

freeTier:
  summary: Object storage with free storage and operation quotas.
  requiresCreditCard: false
  resetCycle: monthly
  confidence: medium

env:
  - key: CLOUDFLARE_ACCOUNT_ID
    secret: false
    required: true
    pattern: "^[a-f0-9]{32}$"

  - key: R2_BUCKET_NAME
    secret: false
    required: true
    pattern: "^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$"

  - key: R2_ENDPOINT
    secret: false
    required: true
    pattern: "^https://[a-f0-9]+\\.r2\\.cloudflarestorage\\.com$"

  - key: R2_ACCESS_KEY_ID
    secret: true
    required: true
    pattern: "^[A-Za-z0-9]{20,}$"

  - key: R2_SECRET_ACCESS_KEY
    secret: true
    required: true
    pattern: "^[A-Za-z0-9/+_=\\-]{30,}$"

prompt:
  goal: Create a Cloudflare R2 bucket and collect S3-compatible credentials.
  steps:
    - Open https://dash.cloudflare.com
    - If not logged in, pause and ask the user to complete login, CAPTCHA, email verification, or 2FA.
    - Go to R2 Object Storage.
    - Create a bucket named baipiao-${project_slug}-assets, unless the user chooses another name.
    - Create an R2 API token or S3-compatible access key for the bucket.
    - Use the minimum permissions needed for the selected bucket.
    - Copy Account ID, Bucket Name, Endpoint, Access Key ID, and Secret Access Key.
  safety:
    - Do not ask for or store the user's web login password.
    - Do not bypass CAPTCHA, 2FA, phone verification, or platform risk checks.
    - Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
    - Do not create an account-wide admin token.
    - Do not delete existing buckets or objects.
    - Do not enable any paid feature.
  outputFormat: |
    CLOUDFLARE_ACCOUNT_ID=...
    R2_BUCKET_NAME=...
    R2_ENDPOINT=...
    R2_ACCESS_KEY_ID=...
    R2_SECRET_ACCESS_KEY=...

test:
  type: s3_compatible
  endpointEnvKey: R2_ENDPOINT
  accessKeyEnvKey: R2_ACCESS_KEY_ID
  secretKeyEnvKey: R2_SECRET_ACCESS_KEY
  bucketEnvKey: R2_BUCKET_NAME
```

---

## 17. 提示词模板

### 17.1 结构化服务模板

```text
You are my browser setup assistant.

Goal:
Help me configure {{service_name}} free-tier resources and create the required API key, project, or credentials.

Entry page:
{{setup_url}}

Steps:
{{steps}}

Safety rules:
- Do not ask for or store my web login password.
- Do not bypass CAPTCHA, 2FA, phone verification, or platform risk checks.
- If login, CAPTCHA, 2FA, or email verification is required, pause and ask me to complete it manually.
- Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
- Do not enable any paid feature.
- Do not delete, reset, or modify my existing important resources.
- Ask me before any action that may cause charges or destructive changes.

When finished, output only this format and nothing else:

{{output_format}}
```

### 17.2 通用服务模板

```text
You are my browser setup assistant.

Goal:
Help me configure the following free developer service and collect any project connection values needed by a developer project.

Service:
- Name: {{service_name}}
- Category: {{category}}
- Website: {{url}}
- Description: {{description}}

Steps:
1. Open the service website.
2. Look for Sign up, Get started, Dashboard, Console, API Keys, Project Settings, Connection String, Endpoint, Database URL, or Access Token.
3. If login, CAPTCHA, 2FA, or email verification is required, pause and ask me to complete it manually.
4. If a free project can be created, create one named baipiao-${project_slug}.
5. Do not click Billing, Upgrade, Payment, Subscribe, or Add payment method.
6. Do not enable any paid feature.
7. Do not delete, reset, or modify existing resources.
8. When done, output the values you found as KEY=VALUE.

Output rules:
- Output only KEY=VALUE lines.
- Do not include explanations.
- Do not invent unknown values.
- Include API keys, tokens, endpoints, project IDs, bucket names, database URLs, or connection strings if available.

Suggested format:

SERVICE_NAME={{service_name}}
SERVICE_URL={{url}}
{{SERVICE_SLUG}}_API_KEY=...
{{SERVICE_SLUG}}_PROJECT_ID=...
{{SERVICE_SLUG}}_ENDPOINT=...
{{SERVICE_SLUG}}_DATABASE_URL=...
```

---

## 18. 用户故事与验收标准

### Epic 1：项目初始化

#### Story 1.1 初始化项目

作为开发者，我希望运行一个命令初始化 baipiao 项目，这样我可以开始管理免费服务。

验收标准：

```text
Given 当前目录没有 .baipiao
When 用户执行 baipiao init
Then 创建 .baipiao/project.json
And 创建 .baipiao/services.json
And 创建 .env.local
And 创建 .env.example

Given 当前目录已经初始化
When 用户再次执行 baipiao init
Then 提示项目已存在
And 不覆盖已有配置
```

#### Story 1.2 指定项目名

```text
Given 用户执行 baipiao init --name my-ai-tool
Then project.json 中 name 为 my-ai-tool
And slug 为 my-ai-tool
```

---

### Epic 2：服务发现

#### Story 2.1 搜索服务

```text
Given 服务目录存在
When 用户执行 baipiao search llm
Then 返回 LLM 相关服务
And 每个结果显示名称、分类、能力
```

#### Story 2.2 查看详情

```text
Given 服务存在
When 用户执行 baipiao info groq
Then 显示服务详情
And 显示配置入口
And 显示 env key
And 显示安全提醒
```

---

### Epic 3：提示词生成

#### Story 3.1 精准提示词

```text
Given groq 有结构化配置
When 用户执行 baipiao prompt groq
Then 生成包含 Groq API Keys 页面链接的提示词
And 包含安全边界
And 包含输出格式 GROQ_API_KEY=...
```

#### Story 3.2 通用提示词

```text
Given 服务没有结构化配置
When 用户执行 baipiao prompt some-service
Then 生成通用配置提示词
And 包含服务名称、官网、说明
And 要求 Agent 输出 KEY=VALUE
```

---

### Epic 4：Setup 主流程

#### Story 4.1 完成结构化服务配置

```text
Given 服务有结构化配置
When 用户执行 baipiao setup groq
Then 系统生成提示词
And 复制到剪贴板
And 等待用户粘贴 Agent 输出
And 解析 GROQ_API_KEY
And 校验格式
And 保存到 Vault
And 写入 .env.local
And 执行连接测试
And 状态变为 tested
```

#### Story 4.2 完成普通服务配置

```text
Given 服务没有结构化配置
When 用户执行 baipiao setup some-service
Then 系统生成通用提示词
And 解析 Agent 输出
And 保存配置
And 状态变为 configured_unverified
```

#### Story 4.3 错误格式重试

```text
Given 用户粘贴的 key 格式错误
When 系统校验失败
Then 不保存
And 提示格式错误
And 允许重新粘贴
```

---

### Epic 5：Vault 密钥中心

#### Story 5.1 查看所有密钥

```text
Given 项目中配置了多个服务
When 用户执行 baipiao vault list
Then 系统展示所有服务相关 key
And 显示 stored / missing / invalid 状态
And 不显示任何密钥明文
```

#### Story 5.2 保存密钥

```text
When 用户执行 baipiao vault set GROQ_API_KEY
Then 终端隐藏输入内容
And 系统校验 key 格式
And 保存到系统 Keychain
And 更新服务状态
```

#### Story 5.3 批量导入

```text
When 用户执行 baipiao vault import
And 粘贴多行 KEY=VALUE
Then 系统解析每个 key
And 校验格式
And 保存 secret 到 Keychain
And 保存非 secret 到项目配置
```

#### Story 5.4 复制密钥

```text
When 用户执行 baipiao vault copy GROQ_API_KEY
Then 系统把密钥复制到剪贴板
And 终端不打印明文
And 可选 30 秒后清空剪贴板
```

#### Story 5.5 删除密钥

```text
When 用户执行 baipiao vault remove GROQ_API_KEY
Then 从系统密钥管理器删除
And 更新服务状态
And 提示是否同步更新 .env.local
```

#### Story 5.6 MCP 不泄露密钥

```text
When Agent 调用 vault_list
Then 只返回 key 名和状态
And 不返回 value

When Agent 请求 reveal secret
Then MCP 拒绝
```

---

### Epic 6：Env 生成

#### Story 6.1 生成 `.env.local`

```text
Given Vault 中有 GROQ_API_KEY
When 用户执行 baipiao env generate
Then .env.local 包含 GROQ_API_KEY
```

#### Story 6.2 生成 `.env.example`

```text
When 用户执行 baipiao env generate --example
Then .env.example 包含 key 名
And 不包含真实值
```

---

### Epic 7：连接测试

#### Story 7.1 测试支持服务

```text
Given GROQ_API_KEY 已保存
When 用户执行 baipiao test groq
Then 系统调用测试逻辑
And 返回 passed 或 failed
```

#### Story 7.2 不支持测试

```text
Given 服务没有 test spec
When 用户执行 baipiao test some-service
Then 输出 TEST_NOT_SUPPORTED
And 状态不变
```

---

### Epic 8：MCP

#### Story 8.1 Agent 查询服务

```text
When Agent 调用 list_services
Then 返回服务列表
```

#### Story 8.2 Agent 生成提示词

```text
When Agent 调用 generate_setup_prompt({ serviceId: "groq" })
Then 返回完整提示词
```

#### Story 8.3 Agent 保存配置

```text
When Agent 调用 save_agent_output
Then 系统解析并保存配置
And 返回保存结果
```

---

## 19. 开发顺序

虽然只有一个产品版本，但建议按下面顺序实现。

### Step 1：项目骨架

- pnpm workspace
- packages/cli
- packages/core
- packages/mcp-server
- registry/catalog
- registry/configs

验收：

```text
pnpm build 通过
baipiao --help 可运行
```

### Step 2：Registry

- 加载 services.json
- 加载 configs/*.yaml
- 合并服务能力
- 支持 search/info

验收：

```text
baipiao search llm 可返回结果
baipiao info groq 可展示配置
```

### Step 3：Prompt Engine

- 结构化服务模板
- 通用服务模板
- 变量替换
- 复制到剪贴板

验收：

```text
baipiao prompt groq 输出精准提示词
baipiao prompt unknown-service 输出通用提示词
```

### Step 4：Agent Output Parser

- KEY=VALUE
- Markdown code block
- 冒号格式
- 敏感字段判断

验收：

```text
parse_agent_output 能解析 3 种输入
```

### Step 5：Vault

- 系统 Keychain 保存
- fallback 方案
- vault list/set/import/copy/remove/health
- 脱敏输出

验收：

```text
baipiao vault set GROQ_API_KEY 成功
baipiao vault list 不显示明文
```

### Step 6：Env Generator

- `.env.local`
- `.env.example`
- include-unverified

验收：

```text
baipiao env generate 成功生成文件
```

### Step 7：Tester

- openai_compatible_chat
- http
- supabase
- s3_compatible

验收：

```text
baipiao test groq 可运行
不支持测试时返回 skipped
```

### Step 8：Setup 主流程

验收：

```text
baipiao setup groq 完整跑通
```

### Step 9：MCP Server

验收：

```text
baipiao mcp 可启动
MCP client 能调用 list_services / generate_setup_prompt / get_status / vault_list
```

---

## 20. Definition of Done

完成标准：

```text
1. baipiao init 可初始化项目
2. baipiao search 可搜索目录
3. baipiao info 可查看服务
4. baipiao prompt 可生成提示词
5. baipiao setup 可完成主流程
6. baipiao output 可导入 Agent 输出
7. baipiao vault 是一级功能
8. baipiao vault list 不泄露明文
9. baipiao vault set/import/copy/remove/health 可用
10. baipiao env generate 可生成 env
11. baipiao test 可测试支持的服务
12. baipiao status 可查看状态
13. baipiao mcp 可启动
14. MCP tools 可被 Agent 调用
15. 所有日志脱敏
16. 不保存网页登录密码
17. 不包含浏览器自动化
```
