# 快速开始

`baipiao` 是一个 **Prompt-first / MCP-first** 的白嫖开发者服务配置器。你用它发现白嫖服务，生成给 Agent 的安全配置提示词，回填 Agent 输出的 Key 和配置，统一存入 Vault，生成 `.env`，测试连接，并通过 MCP 暴露给 AI 编程工具。

## 常用命令

```bash
# 安装 CLI
npm install -g baipiao

# 初始化当前项目
baipiao init --name my-ai-tool

# 搜索 LLM 类白嫖服务
baipiao search llm

# 生成配置提示词并接收 Agent 输出
baipiao setup groq

# 查看 Vault 中的 key 状态
baipiao vault list

# 从 Vault 生成 .env.local
baipiao env generate

# 测试 Groq 连接
baipiao test groq
```

查全量白嫖目录时用这组：

```bash
# 按关键词搜索全量候选库
baipiao catalog candidates --query openrouter

# 按归一化类型过滤
baipiao catalog candidates --category llm

# 按语言返回候选字段
baipiao catalog candidates --locale zh-CN
```

接入 MCP 时用这组：

```bash
# 生成 Cursor 的 MCP 配置
baipiao mcp install cursor

# 生成 Claude Code 的 MCP 配置
baipiao mcp install claude

# 生成 Codex 的 MCP 配置
baipiao mcp install codex
```

## 30 秒看懂

baipiao 不是另一个密钥管理脚本。它把"我要找白嫖服务、让 Agent 去配置、把结果安全接回来"拆成几件稳定的事：

| 你想做什么 | 用哪个入口 | 结果 |
|---|---|---|
| 找已经整理好的白嫖服务 | `baipiao search llm` | 返回可配置/可测试的服务 |
| 查全量白嫖候选库 | `baipiao catalog candidates --query openrouter` | 从 `free-for-dev` 全量数据里搜索 |
| 按语言看候选库 | `baipiao catalog candidates --locale zh-CN` | 返回对应语言字段，缺翻译时 fallback 英文 |
| 让 Agent 配服务 | `baipiao setup groq` | 生成安全提示词，接收 Agent 输出 |
| 管理密钥和 env | `baipiao vault list` / `baipiao env generate` | 密钥进 Vault，项目拿到 `.env.local` |
| 给 Agent 暴露接口 | `baipiao mcp` | 通过 MCP 调同一套能力 |

核心链路是：

```text
服务发现 → 提示词生成 → Agent 执行 → 回填输出 → Vault 管理 → env 生成 → 连接测试 → MCP 暴露
```

全程不自动注册账号、不控制浏览器、不保存网页登录密码。需要登录、验证码、2FA、账单相关动作时，停下来交给人处理。

## 前置条件

- **Node.js >= 20**（运行时环境）
- **pnpm**（包管理器，用于安装）
- 一个终端（macOS Terminal / iTerm2 / Windows Terminal / Linux shell）
- 一个支持 MCP 的 AI 编程工具（可选）：Cursor / Claude Code / Codex

## 安装

```bash
# 从 npm 全局安装
npm install -g baipiao

# 验证安装
baipiao --version
```

## 三条使用路径

第一次使用时，先判断你要走哪条路径：

| 路径 | 入口 | 用途 |
|---|---|---|
| **结构化服务配置** | `search` / `info` / `setup` | 配 Groq、OpenRouter、Supabase 这类已整理白嫖服务 |
| **全量白嫖目录** | `catalog candidates` | 搜索 `free-for-dev` 全量候选，按语言/分类/关键词过滤 |
| **Agent 接口** | `mcp` | 让 Cursor / Claude Code / Codex 通过工具调用服务目录、提示词、Vault、env、测试 |

普通项目通常先走结构化服务配置；找更多白嫖候选时用 `catalog`；要让 Agent 在项目里持续感知状态时接 MCP。

## 五步跑通第一个服务

以 **Groq**（白嫖 LLM API）为例，完整链路如下。

### 第一步：初始化项目

```bash
baipiao init --name my-ai-tool
```

这会在当前目录创建 `.baipiao/`，包含 `project.json`、`services.json`、`.env.local`、`.env.example`。

### 第二步：搜索和确认服务

```bash
# 搜索 LLM 类白嫖服务
baipiao search llm

# 查看 Groq 的详细信息：需要什么 env key、白嫖/部分白嫖、安全提醒
baipiao info groq
```

`search` 输出示例：

```text
$ baipiao search llm
Detected language: en
Found 20 free LLM services:

1. Arize AX                 Free Tier
2. Audio Enhancer           Free Tier
3. Braintrust               Free Tier
...
```

### 第三步：生成 Agent 配置提示词

```bash
baipiao prompt groq --copy
```

`--copy` 会把提示词放入剪贴板。提示词会包含：
- 要打开的页面 URL（如 `https://console.groq.com/keys`）
- 具体操作步骤（创建 API Key、命名规则）
- **安全边界**（不要点 Billing、不要输入密码、不要绕过验证码）
- 期望的输出格式（`GROQ_API_KEY=...`）

把提示词粘贴给你的 Agent（Cursor / Claude Code / Codex），Agent 会去网页里操作并返回结果。

### 第四步：回填并保存配置

```bash
baipiao setup groq
```

粘贴 Agent 的输出：

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

`setup` 会自动：解析 KEY=VALUE → 校验格式 → 存入 Vault → 写入 `.env.local` → 触发连接测试 → 更新服务状态。

### 第五步：验证

```bash
# 查看当前项目状态
baipiao status

# 单独测试 Groq 连接
baipiao test groq

# 查看 Vault 中所有 key 的状态（不显示明文）
baipiao vault list
```

## 完整命令清单

### 项目初始化

- `baipiao init [--name <name>]` — 初始化 `.baipiao` 项目骨架

### 服务发现

- `baipiao search <query>` — 搜索白嫖服务（支持分类词如 `llm`、`database`、`storage`）
- `baipiao info <service>` — 查看服务详情、env 字段、白嫖/部分白嫖、风险提示

### 全量白嫖目录

- `baipiao catalog candidates` — 列出 `free-for-dev` 全量候选
- `baipiao catalog candidates --query openrouter` — 按用户输入搜索候选
- `baipiao catalog candidates --category llm` — 按归一化类型过滤
- `baipiao catalog candidates --locale zh-CN` — 按语言返回候选字段
- `baipiao catalog categories` — 查看候选类型统计
- `baipiao catalog translation-batch --locale ja` — 导出待翻译条目
- `baipiao catalog localize --locale ja --input translations.ja.json` — 导入离线翻译

### 提示词生成

- `baipiao prompt <service> [--copy]` — 生成可给 Agent 的配置提示词

### 配置管理

- `baipiao setup <service>` — 交互式完成服务配置全流程
- `baipiao output <service>` — 从外部输出导入配置

### Vault 密钥中心

- `baipiao vault` — 打开 Vault 总览
- `baipiao vault list` — 查看所有 key 状态（不显示明文）
- `baipiao vault set <KEY>` — 手动保存单个密钥
- `baipiao vault import` — 批量导入 KEY=VALUE
- `baipiao vault copy <KEY>` — 复制密钥到剪贴板
- `baipiao vault remove <KEY>` — 删除密钥
- `baipiao vault health` — 密钥健康检查

### Env 管理

- `baipiao env generate` — 从 Vault 生成 `.env.local`
- `baipiao env generate --example` — 生成 `.env.example`（仅 key 名，不含值）

### 测试与状态

- `baipiao test [service]` — 测试服务连接（支持 OpenAI-compatible / HTTP / Supabase / S3）
- `baipiao status` — 查看项目全局状态摘要

### 技术栈推荐

- `baipiao stack recommend <type>` — 按项目类型推荐白嫖技术栈
  - `type`: `ai_saas` / `rag` / `blog` / `agent_tool` / `mobile_app` / `custom`
- `baipiao setup-stack <type>` — 批量生成技术栈中所有服务的配置提示词

### MCP 集成

- `baipiao mcp` — 启动 stdio MCP server
- `baipiao mcp install <cursor|claude|codex>` — 安装 MCP 客户端配置

## 服务能力分级

baipiao 中的每个服务有三种能力标签：

| 标签 | 含义 |
|---|---|
| `prompt` | 可生成 Agent 配置提示词 |
| `config` | 可识别 key/env 并保存到 Vault |
| `test` | 可自动测试连接 |

所有服务至少支持 `prompt`。有结构化配置的服务额外支持 `config` 和 `test`。

## 典型项目类型推荐栈

以 `baipiao stack recommend` 的输出为参考：

**AI SaaS 项目 (`ai_saas`)**

```text
LLM       → groq / openrouter
Database  → supabase
Storage   → cloudflare-r2
Auth      → clerk
Email     → resend
```

**RAG 项目 (`rag`)**

```text
LLM       → groq / gemini
Vector DB → supabase (pgvector)
Storage   → cloudflare-r2
```

## 安全模型

baipiao 围绕"秘钥不泄露"设计：

- **Vault** 中 secret key 保存到系统密钥管理器（macOS Keychain / Windows Credential Manager / Linux Secret Service）
- 所有日志和状态输出**自动脱敏**，不打印明文
- MCP **不暴露** `vault_reveal`、`get_secret_value` 等危险接口
- 提示词中强制包含**安全边界**：不点击付款/升级/订阅、不绕过验证码、不保存网页登录密码
- `.env.example` 只包含 key 名，不包含真实值

## 架构速览

```text
packages/
  cli/           — baipiao 终端命令入口
  core/          — 共享逻辑：注册表、提示词引擎、解析器、Vault、env、测试器
  mcp-server/    — MCP 协议 server，暴露 allowlist 工具

registry/
  catalog/       — 服务目录和分类数据
  configs/       — 每个结构化服务的 YAML 配置

templates/
  prompts/       — 提示词模板（结构化 / 通用）
```

## 下一步

- 完整 CLI 命令说明 → [CLI 文档](/docs/cli)
- MCP 工具接口和安全边界 → [MCP 文档](/docs/mcp)
