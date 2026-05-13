# baipiao 技术架构

`cli-four-panel-preview.png` 要求 baipiao 不只是“命令可用”，还要有稳定的终端产品体验。因此架构分成四层：CLI 控制器、CLI 展示层、Core 业务层、MCP 入口。

```text
baipiao CLI commands
    ↓
CLI Presentation / Renderer
    ├── init panel
    ├── search panel
    ├── setup progress panel
    └── status panel
    ↓
Core
    ├── Registry
    ├── Catalog Sources
    ├── Prompt Engine
    ├── Agent Output Parser
    ├── Vault
    ├── Env Generator
    ├── Connection Tester
    ├── Status Manager
    ├── Stack Recommender
    ├── View Models
    └── Errors / Schemas
    ↓
MCP Server
```

## 设计稿适配结论

当前 CLI/Core/MCP 分层可以支撑主流程，但如果没有单独的 CLI Presentation 层，就无法稳定满足 `docs/assets/cli-four-panel-preview.png` 的四个视图：

- `baipiao init`：需要品牌字样、初始化成功面板、创建文件列表、下一步搜索提示。
- `baipiao search llm`：需要编号结果、`Free Tier` / `Limited Free` / `Paid` / `Unknown` 徽标、quick filters。
- `baipiao setup groq`：需要 prompt copied、等待 Agent 输出、masked key、校验/保存/env/test 进度、Vault Status。
- `baipiao status`：需要 `AI Services`、`Backend Services`、`Vault` 分组和 quick actions。

因此 CLI 展示层必须是显式模块，不能把展示逻辑散落在命令 handler 或 core service 中。

## 技术栈

```text
Language: TypeScript
Runtime: Node.js
Package manager: pnpm
CLI: lightweight argv dispatcher
MCP: @modelcontextprotocol/sdk
Config: yaml
Schema validation: zod
Vault: keytar or platform-specific secure storage
Env: dotenv
Clipboard: clipboardy
Testing: vitest
```

CLI 渲染可以使用轻量终端库，但必须满足：

- 支持 TTY 彩色输出。
- 支持 `NO_COLOR`、CI、非 TTY 纯文本 fallback。
- 不在 core 或 MCP response 中写 ANSI escape codes。
- snapshot 测试可稳定断言核心文案和脱敏内容。

## 包结构

```text
packages/
  cli/
    src/
      commands/
      renderers/
      terminal/

  core/
    src/
      registry/
      prompt/
      parser/
      vault/
      env/
      tester/
      status/
      stack/
      view-models/
      errors/
      schemas/

  mcp-server/
    src/
      protocol/
      transports/
      tools/
      client-configs/
```

## 数据流

```text
CLI command
→ core service
→ structured result / workflow events
→ CLI view model
→ CLI renderer
→ terminal output
```

MCP 数据流不同：

```text
MCP request
→ tool handler
→ core service
→ structured JSON response
```

MCP 不返回 CLI 面板文本，也不返回密钥明文。

## 核心规则

1. CLI 和 MCP 复用 core。
2. CLI renderer 只处理展示，不保存状态、不访问 Vault、不测试连接。
3. Core 返回结构化数据和 workflow events，不包含 ANSI。
4. Vault 不通过 MCP 返回明文。
5. Prompt Engine 同时支持结构化服务和通用服务。
6. Agent Output Parser 必须容忍多种输出格式。
7. Tester 对不支持的服务返回 skipped，不报错。
8. Search 结果必须携带免费层展示状态，用于设计稿徽标。
9. Status Manager 必须能输出服务分组和 Vault 汇总。
10. 四个 demo 面板必须有 snapshot 或等价验收测试。
