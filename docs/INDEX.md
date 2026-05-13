# baipiao 文档索引

这个页面是项目文档入口。新用户从上往下读；实现者按主题跳转。

## 产品与设计

| 文档 | 用途 |
|---|---|
| [PRD](./PRD.md) | 产品范围、用户故事、命令总表、MCP tools、数据模型、Definition of Done |
| [README](../README.md) | 落地页、快速开始、核心能力、演示图、安装入口 |
| [落地页与文档站设计](./WEBSITE_AND_DOCS.md) | 首页、文档站、多语言、设计系统、中文设计稿资产 |
| [CLI 四面板设计稿](./assets/cli-four-panel-preview.png) | `init`、`search`、`setup`、`status` 的终端体验基准 |

## 架构与接口

| 文档 | 用途 |
|---|---|
| [技术架构](./ARCHITECTURE.md) | CLI Presentation、Core、MCP Server、数据流、包结构 |
| [API / Vault / MCP](./API_AND_VAULT.md) | CLI、MCP、Vault、Env、错误码、安全边界 |
| [数据源、Normalize、Prompt 与 MCP 流程](./DATA_SOURCES_AND_PROMPTS.md) | free-for-dev 获取、normalized schema、prompt 生成、MCP 调用链路 |

## 最短阅读路径

1. 产品负责人：先读 [README](../README.md)，再读 [PRD](./PRD.md)。
2. 实现者：先读 [技术架构](./ARCHITECTURE.md)，再读 [API / Vault / MCP](./API_AND_VAULT.md)。
3. 做数据源：读 [数据源流程](./DATA_SOURCES_AND_PROMPTS.md)。
4. 做 MCP：读 [API / Vault / MCP](./API_AND_VAULT.md)。
5. 做官网/文档站：读 [落地页与文档站设计](./WEBSITE_AND_DOCS.md)。
