# baipiao API 与 Vault 详细设计

本文档专门描述 `baipiao` 的 CLI 接口、MCP Tools、Vault 密钥中心、数据结构与安全边界。

---

## 1. CLI 接口总览

```bash
baipiao init
baipiao search <query>
baipiao info <service>
baipiao prompt <service>
baipiao setup <service>
baipiao setup-stack <stack>
baipiao output <service>
baipiao catalog candidates
baipiao catalog categories
baipiao catalog localize
baipiao catalog translation-batch
baipiao catalog refresh --source free-for-dev
baipiao catalog review

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

`baipiao search <query>` 默认查询全量 `free-for-dev` 大 JSON，并支持模糊搜索与中/英/日/韩/法/西语关键词识别。需要表格、分页、指定语言或 source-category 时，再使用 `baipiao catalog candidates`。

---

## 2. Vault CLI

### 2.1 `baipiao vault`

显示交互式密钥中心概览。

输出：

```text
Service          Key                         Status     Scope       Test
Groq             GROQ_API_KEY                stored     server      passed
OpenRouter       OPENROUTER_API_KEY          missing    server      -
Supabase         SUPABASE_URL                stored     public      passed
Supabase         SUPABASE_SERVICE_ROLE_KEY   stored     server      warning
```

### 2.2 `baipiao vault list`

列出密钥状态，不显示明文。

```ts
type VaultListItem = {
  key: string
  serviceId?: string
  status: "stored" | "missing" | "invalid" | "untested"
  scope: "public" | "server" | "unknown"
  testStatus?: "passed" | "failed" | "skipped"
}
```

### 2.3 `baipiao vault set <KEY>`

保存单个密钥。

```bash
baipiao vault set GROQ_API_KEY
baipiao vault set GROQ_API_KEY --service groq
```

行为：

- 读取隐藏输入
- 校验格式
- 保存到系统密钥管理器
- 更新服务状态
- 不在日志输出明文

### 2.4 `baipiao vault import`

批量导入 env 文本或 Agent 输出。

输入：

```env
GROQ_API_KEY=gsk_xxx
OPENROUTER_API_KEY=sk-or-v1-xxx
```

输出：

```ts
type VaultImportResult = {
  saved: {
    key: string
    target: "keychain" | "project_config"
  }[]
  failed: {
    key?: string
    reason: string
  }[]
}
```

### 2.5 `baipiao vault copy <KEY>`

把密钥复制到剪贴板，不打印明文。

```ts
type VaultCopyResult = {
  key: string
  copied: boolean
  clearAfterSeconds?: number
}
```

### 2.6 `baipiao vault reveal <KEY>`

显示明文。必须二次确认。只允许 CLI，不允许 MCP。

### 2.7 `baipiao vault remove <KEY>`

删除密钥。

### 2.8 `baipiao vault health`

检查：

- 缺失
- 格式错误
- server-only 风险
- 测试状态
- `.env` 是否同步

---

## 3. MCP Tools

MCP 只暴露高层能力，不暴露浏览器控制，不返回密钥明文。

### 3.0 协议生命周期

MCP JSON-RPC envelope 支持标准客户端握手与保活：

- `initialize` 返回协商后的 `protocolVersion`、`capabilities.tools` 和 `serverInfo`。
- `notifications/initialized` 以及其他 notification 不返回 JSON-RPC error。
- `ping` 返回空的成功结果。
- HTTP transport 对 notification-only 请求返回 `202` 和空 body，避免把通知误报为协议错误。

### 3.1 `list_services`

默认 MCP 搜索入口。它查询全量 `free-for-dev` 大 JSON，而不是少量内置服务表；支持模糊搜索、分类、语言识别和能力过滤。

```ts
type ListServicesInput = {
  query?: string
  category?: string
  capability?: "prompt" | "config" | "test"
  limit?: number
}

type ListServicesOutput = {
  detectedLanguage: "en" | "zh-CN" | "ja" | "ko" | "fr" | "es"
  services: FreeForDevCatalogItem[]
}
```

### 3.2 `get_service_info`

```ts
type GetServiceInfoInput = {
  serviceId: string
}

type GetServiceInfoOutput = {
  service: ServiceInfo
}
```

### 3.3 `generate_setup_prompt`

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
  capability: ("prompt" | "config" | "test")[]
}
```

### 3.4 `parse_agent_output`

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

### 3.5 `save_agent_output`

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

### 3.6 `validate_secret`

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

### 3.7 `vault_list`

```ts
type VaultListInput = {
  serviceId?: string
}

type VaultListOutput = {
  entries: VaultEntryPublic[]
}

type VaultEntryPublic = {
  key: string
  serviceId?: string
  status: "stored" | "missing" | "invalid" | "untested"
  scope: "public" | "server" | "unknown"
  lastUpdatedAt?: string
  lastTestAt?: string
}
```

注意：不返回 value。

### 3.8 `vault_set`

```ts
type VaultSetInput = {
  key: string
  value: string
  serviceId?: string
}

type VaultSetOutput = {
  key: string
  saved: boolean
  serviceId?: string
}
```

### 3.9 `vault_import`

```ts
type VaultImportInput = {
  text: string
  serviceId?: string
}

type VaultImportOutput = VaultImportResult
```

### 3.10 `vault_copy`

```ts
type VaultCopyInput = {
  key: string
}

type VaultCopyOutput = {
  key: string
  copied: boolean
}
```

注意：不返回 value。

### 3.11 `vault_remove`

```ts
type VaultRemoveInput = {
  key: string
}

type VaultRemoveOutput = {
  key: string
  removed: boolean
}
```

### 3.12 `vault_health`

```ts
type VaultHealthInput = {}

type VaultHealthOutput = {
  items: VaultHealthItem[]
}

type VaultHealthItem = {
  key: string
  serviceId?: string
  status: "ok" | "missing" | "invalid" | "warning"
  message: string
}
```

### 3.13 `generate_env`

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

### 3.14 `test_connection`

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

### 3.15 `get_status`

```ts
type GetStatusInput = {}

type GetStatusOutput = ProjectStatus
```

### 3.16 `recommend_stack`

```ts
type RecommendStackInput = {
  useCase: "ai_saas" | "rag" | "blog" | "agent_tool" | "mobile_app" | "custom"
}

type RecommendStackOutput = {
  stack: RecommendedStack
}
```

### 3.17 `list_free_catalog_candidates`

全量候选库的显式查询入口。需要 `locale`、`sourceCategory`、`offset` 等参数时使用它；普通搜索优先用 `list_services`。

```ts
type ListFreeCatalogCandidatesInput = {
  query?: string
  category?: string
  sourceCategory?: string
  locale?: "en" | "zh-CN" | "ja" | "ko" | "fr" | "es"
  systemLocale?: string
  limit?: number
  offset?: number
}

type ListFreeCatalogCandidatesOutput = {
  items: FreeForDevCatalogItem[]
  total: number
  limit: number
  offset: number
  requestedLocale: "en" | "zh-CN" | "ja" | "ko" | "fr" | "es"
}
```

### 3.18 `get_free_catalog_categories`

```ts
type GetFreeCatalogCategoriesInput = {
  locale?: "en" | "zh-CN" | "ja" | "ko" | "fr" | "es"
}

type GetFreeCatalogCategoriesOutput = {
  categories: { id: string; name: string; count: number }[]
  sourceCategories: { id: string; name: string; count: number }[]
  total: number
}
```

### 3.19 `apply_free_catalog_translations`

```ts
type ApplyFreeCatalogTranslationsInput = {
  locale: "zh-CN" | "ja" | "ko" | "fr" | "es"
  translations: {
    id: string
    name?: string
    description?: string
    freeTierText?: string
  }[]
}

type ApplyFreeCatalogTranslationsOutput = {
  updated: number
  missing: string[]
}
```

### 3.20 `get_free_catalog_translation_batch`

```ts
type GetFreeCatalogTranslationBatchInput = {
  locale: "zh-CN" | "ja" | "ko" | "fr" | "es"
  query?: string
  category?: string
  sourceCategory?: string
  limit?: number
  offset?: number
  untranslatedOnly?: boolean
}

type GetFreeCatalogTranslationBatchOutput = {
  locale: "zh-CN" | "ja" | "ko" | "fr" | "es"
  items: {
    id: string
    category: string
    sourceCategory: string
    url: string
    source: {
      name: string
      description: string
      freeTierText: string
    }
    existingTranslation?: {
      id: string
      name?: string
      description?: string
      freeTierText?: string
      status?: string
      reviewStatus?: string
      translatedAt?: string
    }
  }[]
  total: number
  limit: number
  offset: number
  untranslatedOnly: boolean
}
```

---

## 4. MCP 禁止能力

禁止提供：

```text
vault_reveal
get_secret_value
browser_click
browser_type
shell_exec
read_any_file
write_any_file
delete_file
upload_secret
```

MCP 不能成为泄密通道。

---

## 5. Vault 内部接口

```ts
interface VaultService {
  set(input: VaultSetInternalInput): Promise<VaultSetInternalOutput>
  get(key: string): Promise<string | null>
  has(key: string): Promise<boolean>
  remove(key: string): Promise<void>
  list(input?: VaultListInput): Promise<VaultEntryPublic[]>
  importText(input: VaultImportInput): Promise<VaultImportOutput>
  copy(key: string): Promise<VaultCopyOutput>
  reveal(key: string, options: { confirm: boolean }): Promise<string>
  health(): Promise<VaultHealthOutput>
}
```

内部 `get` 和 `reveal` 只给 CLI/Core 使用，不通过 MCP 暴露。

---

## 6. Env 生成接口

```ts
interface EnvGenerator {
  generate(input: GenerateEnvInput): Promise<GenerateEnvOutput>
  generateExample(path?: string): Promise<GenerateEnvOutput>
  collectProjectEnv(options?: {
    includeUnverified?: boolean
  }): Promise<EnvEntry[]>
}
```

规则：

- `.env.local` 可写真实值
- `.env.example` 不写真实值
- 默认不写 `configured_unverified`
- `--include-unverified` 才写未验证配置

---

## 7. Secret 判断规则

key 包含以下词默认是 secret：

```text
KEY
TOKEN
SECRET
PASSWORD
PRIVATE
CREDENTIAL
ACCESS_KEY
SERVICE_ROLE
```

public 判定：

```text
URL
ENDPOINT
PROJECT_ID
BUCKET_NAME
PUBLIC_KEY
ANON_KEY
```

注意：`SUPABASE_ANON_KEY` 虽然可用于前端，但仍然标记为 secret=true、public=true，提醒用户谨慎。

---

## 8. 日志脱敏

必须脱敏：

```text
gsk_xxx            → gsk_***
sk-or-v1-xxx       → sk-or-v1-***
eyJxxx             → eyJ***
AKIAxxx            → AKIA***
```

所有 CLI 输出、日志文件、`.baipiao/outputs/*.md` 都必须脱敏。

---

## 9. 错误码

```ts
type ErrorCode =
  | "PROJECT_NOT_INITIALIZED"
  | "SERVICE_NOT_FOUND"
  | "PROMPT_GENERATION_FAILED"
  | "AGENT_OUTPUT_PARSE_FAILED"
  | "SECRET_VALIDATION_FAILED"
  | "SECRET_SAVE_FAILED"
  | "VAULT_ENTRY_NOT_FOUND"
  | "VAULT_REVEAL_REQUIRES_CONFIRMATION"
  | "ENV_GENERATION_FAILED"
  | "TEST_NOT_SUPPORTED"
  | "TEST_CONNECTION_FAILED"
  | "MCP_TOOL_FAILED"
  | "CATALOG_LOAD_FAILED"
```

统一错误：

```ts
type BaipiaoError = {
  code: ErrorCode
  message: string
  details?: unknown
  recoverable: boolean
}
```
