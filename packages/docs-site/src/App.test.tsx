import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getSearchResults, renderAppForPath } from "./App.js";
import type { FreeForDevRegistryData } from "./registry/free-for-dev.js";

const registryFixture = {
  schemaVersion: "baipiao.free-for-dev.normalized.v1",
  generatedAt: "2026-05-13T12:53:02.040Z",
  source: {
    id: "free-for-dev",
    url: "https://github.com/ripienaar/free-for-dev",
    rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
    importedAt: "2026-05-12T12:08:50.953Z"
  },
  parser: {},
  stats: {
    categoryCount: 1,
    parsedItemCount: 1,
    skippedItemCount: 0,
    warningCount: 0
  },
  items: [
    {
      id: "free-for-dev:api:apify",
      name: "Apify",
      slug: "apify",
      category: "unknown",
      sourceCategory: "APIs, Data, and ML",
      description: "Web scraping and automation platform.",
      url: "https://www.apify.com/",
      capability: ["prompt"],
      freeTierText: "Free plan with monthly platform credits.",
      freeTierStatus: "free_tier",
      source: {
        id: "free-for-dev",
        url: "https://github.com/ripienaar/free-for-dev",
        rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
        importedAt: "2026-05-12T12:08:50.953Z"
      },
      rawExcerptRef: {
        path: "registry/sources/free-for-dev/raw/20260512T120850953Z.md",
        lineStart: 124,
        lineEnd: 124
      },
      confidence: "medium",
      reviewStatus: "needs_review",
      matchedServiceId: null,
      warnings: [],
      enrichment: {
        localization: {
          "zh-CN": {
            name: "Apify",
            description: "Web 抓取和自动化平台。",
            freeTierText: "每月包含平台额度的免费计划。",
            status: "translated",
            reviewStatus: "needs_review",
            translatedAt: "2026-05-13T16:10:12.271Z"
          }
        }
      }
    }
  ]
} satisfies FreeForDevRegistryData;

describe("docs site app", () => {
  it("renders the developer landing page from the design brief", () => {
    const html = renderToStaticMarkup(renderAppForPath("/"));

    expect(html).toContain("白嫖");
    expect(html).not.toContain("<h1>baipiao</h1>");
    expect(html).toContain("让 Agent 配白嫖栈");
    expect(html).toContain("Prompt-first");
    expect(html).not.toContain("Data Sources");
    expect(html).toContain("MCP-first");
    expect(html).toContain("npm install -g baipiao");
    expect(html).toContain("baipiao mcp install codex");
    expect(html).toContain("CLI / MCP 接入");
    expect(html).toContain("CLI Preview");
    expect(html).toContain("核心入口");
    expect(html).toContain("白嫖数据");
    expect(html).toContain("从安装到 Agent 可用");
    expect(html).toContain("安全边界");
    expect(html).toContain("href=\"/docs\"");
    expect(html).toContain("href=\"/docs/cli\"");
    expect(html).toContain("href=\"/docs/mcp\"");
    expect(html).toContain("href=\"/en\"");
    expect(html).toContain("href=\"/ja\"");
    expect(html).toContain("href=\"/fr\"");
    expect(html).not.toContain("<code>/docs</code>");
    expect(html).toContain("data-scroll-section=\"hero\"");
    expect(html).toContain("data-scroll-section=\"docs-hub\"");
    expect(html).toContain("data-scroll-section=\"status-grid\"");
  });

  it("switches landing locales without navigating into docs", () => {
    const html = renderToStaticMarkup(renderAppForPath("/en"));

    expect(html).toContain("Free-stack setup for Agents");
    expect(html).toContain("href=\"/\"");
    expect(html).toContain("href=\"/ja\"");
    expect(html).toContain("href=\"/docs/en/cli\"");
    expect(html).not.toContain("让 Agent 配免费栈");
  });

  it("preserves the current docs slug when selecting another language", () => {
    const html = renderToStaticMarkup(renderAppForPath("/docs/mcp"));

    expect(html).toContain("href=\"/docs/en/mcp\"");
    expect(html).toContain("href=\"/docs/ja/mcp\"");
    expect(html).toContain("href=\"/docs/fr/mcp\"");
  });

  it("renders docs chrome with navigation, search, and pager", () => {
    const html = renderToStaticMarkup(renderAppForPath("/docs/cli"));

    expect(html).toContain("搜索文档");
    expect(html).toContain("<span>CLI</span>");
    expect(html).toContain("href=\"/docs/registry\"");
    expect(html).not.toContain("On this page");
    expect(html).toContain("← 上一页: ");
    expect(html).toContain("下一页: MCP");
    expect(html).toContain("baipiao init");
    expect(html).toContain("baipiao search");
  });

  it("does not duplicate document titles in rendered docs", () => {
    for (const [path, title] of [
      ["/docs", "快速开始"],
      ["/docs/cli", "CLI"],
      ["/docs/mcp", "MCP"]
    ] as const) {
      const html = renderToStaticMarkup(renderAppForPath(path));

      expect(html.match(new RegExp(`<h1>${title}</h1>`, "g"))).toHaveLength(1);
      expect(html).not.toContain(`<h2 id="${path === "/docs" ? "next" : title.toLowerCase()}">${title}</h2>`);
    }
  });

  it("keeps localized docs links and escaped table pipes intact", () => {
    const html = renderToStaticMarkup(renderAppForPath("/docs/en/cli"));

    expect(html).toContain("Previous: Registry");
    expect(html).not.toContain("Previous: 快速开始");
    expect(html).toContain("href=\"/docs/en/mcp\"");
    expect(html).toContain("<code>ai_saas | rag | blog | agent_tool | mobile_app | custom</code>");
  });

  it("renders localized docs routes for each locale", () => {
    const html = renderToStaticMarkup(renderAppForPath("/docs/ja/cli"));

    expect(html).toContain("CLI");
    expect(html).toContain("baipiao init");
    expect(html).toContain("href=\"/docs/ko/cli\"");
    expect(html).toContain("href=\"/docs/fr/cli\"");
    expect(html).toContain("href=\"/docs/es/cli\"");
  });

  it("localizes registry navigation chrome outside English", () => {
    const html = renderToStaticMarkup(renderAppForPath("/docs/ja/registry"));

    expect(html).toContain("レジストリ");
    expect(html).toContain("ソースカテゴリ");
    expect(html).not.toContain(">_ REGISTRY");
    expect(html).not.toContain(">Registry</a>");
  });

  it("renders the registry explorer shell and loads the free-for-dev JSON source on demand", () => {
    const html = renderToStaticMarkup(renderAppForPath("/docs/registry"));

    expect(html).toContain("白嫖数据");
    expect(html).toContain("来源分类");
    expect(html).toContain("收录整理后的白嫖服务");
    expect(html).not.toContain("SOURCE CATEGORIES");
    expect(html).toContain("正在加载数据");
    expect(html).toContain("/registry/free-for-dev/normalized.json");
    expect(html).not.toContain("下载 JSON");
    expect(html).toContain("href=\"/docs/en/registry\"");
    expect(html).not.toContain("<select");
    expect(html).toContain("全部状态");
    expect(html).not.toContain("免费层");
    expect(html).toContain("热门服务");
    expect(html).not.toContain("待审核");
    expect(html).not.toContain("按审核状态筛选");
  });

  it("unifies docs search with localized registry data results", () => {
    const results = getSearchResults("平台额度", "zh-CN", registryFixture);

    expect(results).toContainEqual({
      title: "白嫖数据 / Apify",
      href: "/docs/registry?q=Apify",
      excerpt: "Web 抓取和自动化平台。"
    });
  });
});
