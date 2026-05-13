import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { docsPages } from "../i18n/content.js";
import { docsLocales } from "../i18n/index.js";

const baseRoutes = [
  "/",
  "/docs",
] as const;

export type BuildStaticSiteOptions = {
  cwd?: string;
  outputDir?: string;
};

export async function buildStaticSite(options: BuildStaticSiteOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const outputDir = options.outputDir ?? join(cwd, "dist", "client");
  const routes = getRoutes();
  const fallbackHtml = await readViteIndex(outputDir);
  await Promise.all(routes.map((route) => writeRoute(outputDir, route, fallbackHtml ?? renderHtml(route))));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildStaticSite();
}

function getRoutes(): string[] {
  const docsSlugs = docsPages["zh-CN"].filter((page) => page.slug !== "index").map((page) => page.slug);
  const baseDocsRoutes = docsSlugs.map((slug) => `/docs/${slug}`);
  const localeLandingRoutes = docsLocales
    .filter((locale) => locale !== "zh-CN")
    .map((locale) => `/${locale}`);
  const localeRoutes = Object.entries(docsPages).flatMap(([locale, pages]) => {
    return pages.map((page) => page.slug === "index" ? `/docs/${locale}` : `/docs/${locale}/${page.slug}`);
  });

  return [...baseRoutes, ...localeLandingRoutes, ...baseDocsRoutes, ...localeRoutes];
}

async function writeRoute(outputDir: string, route: string, html: string): Promise<void> {
  const routePath = route === "/" ? "index.html" : join(route.slice(1), "index.html");
  const outputPath = join(outputDir, routePath);
  await mkdir(join(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, html, "utf8");
}

async function readViteIndex(outputDir: string): Promise<string | undefined> {
  try {
    return await readFile(join(outputDir, "index.html"), "utf8");
  } catch {
    return undefined;
  }
}

function renderHtml(route: string): string {
  const title = route === "/" ? "baipiao" : `baipiao ${route}`;
  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    "</head>",
    "<body>",
    "<main>",
    "<h1>baipiao</h1>",
    '<a href="/docs">查看文档</a>',
    '<a href="/docs/cli">CLI 文档</a>',
    `<p data-route="${escapeHtml(route)}">Prompt-first / MCP-first CLI 文档站。</p>`,
    "</main>",
    "</body>",
    "</html>"
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
