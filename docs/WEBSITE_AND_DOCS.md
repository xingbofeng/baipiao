# baipiao 落地页与文档站设计

## 定位

baipiao 需要一个文档型开发者首页和多页文档站。

这不是产品 Web App，也不是纯营销单页。首页用于解释产品、展示 CLI 体验、把用户导入文档；文档站用于承载 Quick Start、CLI、MCP 三类可访问内容。

## 设计稿资产

当前设计稿是中文文档版本，作为 `zh-CN` 视觉与内容基准。

| 文件 | 用途 |
|---|---|
| `docs/assets/cli-four-panel-preview.png` | CLI 四面板体验基准 |
| `docs/assets/product-demo-chinese.gif` | README 中文宣传片 |
| `docs/assets/product-demo-english.gif` | README 英文宣传片 |
| `docs/assets/agent-setup-loop.svg` | README 英文 Agent 配置流程图 |
| `docs/assets/agent-setup-flow-chinese.svg` | README 中文 Agent 配置流程图 |

## 路由

首页：

```text
/
```

文档站：

```text
/docs
/docs/cli
/docs/mcp
```

语言路由：

```text
/docs/zh-CN
/docs/zh-CN/cli
/docs/zh-CN/mcp

/docs/en
/docs/en/cli
/docs/en/mcp
```

默认语言：

```text
zh-CN
```

英文文档必须存在同构页面，但可以在首版中标记为 `translation_pending`，不能缺页。

## 首页结构

首页必须包含：

- 顶部导航：文档、CLI、MCP、GitHub、搜索。
- Hero：项目名 `baipiao`、Slogan、Prompt-first / Vault-first / MCP-first。
- CTA：`查看文档` 跳转 `/docs`，`快速开始` 跳转 `/docs`。
- CLI Preview：展示 `baipiao init`、`baipiao search llm`、`baipiao setup groq`、`baipiao status`。
- Docs Hub：Quick Start、CLI、MCP。
- Security：本地 Vault、密钥不落盘、最小权限、审计日志。
- MCP Servers：展示 MCP 连接状态和命令提示。
- Data Sources：展示数据源状态和 `baipiao ds list` 或等价入口。
- Footer：License、隐私政策、安全、更新日志。

首页只做入口和产品理解，不承载完整文档正文。

## 首页移动端与动画

首页必须从设计稿的桌面视觉延展到移动端，而不是只缩放桌面布局。

移动端要求：

- 320px 到 760px 视口下，Header、品牌、导航、搜索、CTA、CLI Preview、Docs Hub、状态面板和 Footer 必须保持可读可点。
- 页面整体不得出现横向滚动；长命令、路径、状态文本和卡片标题必须允许换行或在局部容器内滚动。
- CTA 在移动端必须变为单列满宽按钮，`/docs`、`/docs/cli` 和 `/docs/mcp` 路径仍清晰可见。
- CLI Preview 不得撑破视口；代码内容只允许在终端块内部横向滚动。
- Docs Hub 和状态面板在移动端必须单列展示。

滚动动画要求：

- 首页 Hero、Docs Hub、状态面板必须使用稳定的 `data-scroll-section` hook。
- 默认使用 CSS-only reveal 动画，滚动进入时有轻量位移和透明度过渡。
- 必须支持 `prefers-reduced-motion: reduce`，用户开启减少动画时降低或关闭动画。
- 动画不得影响 CTA 点击、文档跳转、键盘导航或移动端阅读。

## 文档页结构

文档详情页必须包含：

- 顶部栏：品牌、搜索、GitHub、主题切换、语言切换。
- 左侧导航：Quick Start、CLI、MCP。
- 正文区域：标题、描述、徽标、代码块、表格、Callout。
- 右侧目录：On this page。
- 左下角状态卡片：Get started、MCP/Data Sources/Vault 状态。
- 上一页 / 下一页。

## 中英文支持

文档站固定放在 `packages/docs-site`，使用 React + Vite 构建。内容目录：

```text
packages/docs-site/
  package.json
  index.html
  vite.config.ts
  src/
    main.tsx
    App.tsx
    app/
    components/
    styles/
    i18n/
  content/
    zh-CN/
      index.md
      cli.md
      mcp.md
    en/
      index.md
      cli.md
      mcp.md
```

i18n 规则：

- 代码、CLI 命令、env key、MCP tool name、错误码不翻译。
- `baipiao` 项目名不翻译。
- 中文设计稿作为 `zh-CN` 基准。
- 英文文档页面必须保留相同 slug 和导航结构。
- 缺少翻译时 fallback 到 `zh-CN` 并显示 `translation_pending` 标记。

## 设计风格

视觉关键词：

```text
terminal
developer docs
dark UI
grid background
neon green
cyan accent
purple accent
compact cards
code-first
```

设计 token：

```text
green brand: #00FF90
cyan accent: #22D3EE
slate bg: #0F1419
surface: #161C22
border: #1E2630
text: #E6EDF3
text muted: #88949E
purple accent: #7C5CFF
warning: #FACC15
error: #FF4D4F
```

排版：

- UI 字体：Space Grotesk / Inter fallback。
- Mono 字体：JetBrains Mono / Fira Code fallback。
- H1：36/44。
- H2：28/36。
- H3：20/28。
- Body：14/20。
- Caption：11/14。

组件：

- Button：primary、secondary、ghost、disabled。
- Search：支持快捷键提示。
- Sidebar nav：带 active state 和图标。
- Tabs、pagination、breadcrumbs。
- Badge：Beta、Stable、Deprecated、Experimental、Coming Soon。
- Callout：提示、信息、注意、错误。
- Table：紧凑、可扫描。
- Terminal block：macOS traffic lights、复制按钮、命令高亮。

## 验收

- 首页 CTA 跳转正确：`/docs`、`/docs/cli` 和 `/docs/mcp`。
- 文档站至少有中文和英文两套路由。
- 中文设计稿中的首页、文档详情页、设计系统组件都有实现映射。
- 搜索框、侧边栏、右侧目录、上一页/下一页、语言切换、主题切换都有状态。
- 所有代码块和终端块可复制。
- 移动端侧边栏可折叠，正文不横向溢出。
- 首页在 390px 移动端和桌面宽度下不得出现页面级横向溢出。
- 首页滚动分区必须有 CSS reveal 动画，并提供 reduced-motion 降级。

## Vercel 发布

文档站必须能发布到 Vercel。

构建产物：

```text
packages/docs-site/dist/client/
```

该目录由 `pnpm docs:build` 触发 Vite client build 和静态路由生成后产出，并作为 Vercel 静态部署输出。

推荐 workflow：

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - "docs/**"
      - "packages/docs-site/**"
      - "packages/**"
      - ".github/workflows/docs.yml"
  pull_request:
    paths:
      - "docs/**"
      - "packages/docs-site/**"
      - ".github/workflows/docs.yml"

permissions:
  contents: read

concurrency:
  group: docs
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm docs:build

  deploy:
    if: github.event_name == 'push'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -X POST "$VERCEL_DEPLOY_HOOK_URL"
        env:
          VERCEL_DEPLOY_HOOK_URL: ${{ secrets.VERCEL_DEPLOY_HOOK_URL }}
```

规则：

- PR 只 build，不发布 production。
- push 到默认分支才 deploy。
- Vercel 自定义域名使用根路径 base path `/`。
- 本地开发 base path 使用 `/`。
- 不把 `baipiao.dev` 写死为项目名或站点名。
- 如果未来使用自定义域名，用独立配置声明。
