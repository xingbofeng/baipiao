import type { DocsLocale } from "./index.js";

export type DocsPageSlug =
  | "index"
  | "cli"
  | "mcp"
  | "registry";

export type TranslationStatus = "translated" | "translation_pending" | "fallback";

export type DocsPage = {
  slug: DocsPageSlug;
  title: string;
  translationStatus: TranslationStatus;
};

const slugs: DocsPageSlug[] = [
  "index",
  "registry",
  "cli",
  "mcp"
];

export const docsPages: Record<DocsLocale, DocsPage[]> = {
  "zh-CN": [
    { slug: "index", title: "快速开始", translationStatus: "translated" },
    { slug: "registry", title: "白嫖数据", translationStatus: "translated" },
    { slug: "cli", title: "CLI", translationStatus: "translated" },
    { slug: "mcp", title: "MCP", translationStatus: "translated" }
  ],
  en: [
    { slug: "index", title: "Quick Start", translationStatus: "translation_pending" },
    { slug: "registry", title: "Registry", translationStatus: "translation_pending" },
    { slug: "cli", title: "CLI", translationStatus: "translation_pending" },
    { slug: "mcp", title: "MCP", translationStatus: "translation_pending" }
  ],
  ja: [
    { slug: "index", title: "クイックスタート", translationStatus: "translated" },
    { slug: "registry", title: "レジストリ", translationStatus: "translated" },
    { slug: "cli", title: "CLI", translationStatus: "translated" },
    { slug: "mcp", title: "MCP", translationStatus: "translated" }
  ],
  ko: [
    { slug: "index", title: "빠른 시작", translationStatus: "translated" },
    { slug: "registry", title: "레지스트리", translationStatus: "translated" },
    { slug: "cli", title: "CLI", translationStatus: "translated" },
    { slug: "mcp", title: "MCP", translationStatus: "translated" }
  ],
  fr: [
    { slug: "index", title: "Démarrage rapide", translationStatus: "translated" },
    { slug: "registry", title: "Registre", translationStatus: "translated" },
    { slug: "cli", title: "CLI", translationStatus: "translated" },
    { slug: "mcp", title: "MCP", translationStatus: "translated" }
  ],
  es: [
    { slug: "index", title: "Inicio rápido", translationStatus: "translated" },
    { slug: "registry", title: "Registro", translationStatus: "translated" },
    { slug: "cli", title: "CLI", translationStatus: "translated" },
    { slug: "mcp", title: "MCP", translationStatus: "translated" }
  ]
};

export function validateDocsContentShape(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const locale of Object.keys(docsPages) as DocsLocale[]) {
    const localeSlugs = new Set(docsPages[locale].map((page) => page.slug));
    for (const slug of slugs) {
      if (!localeSlugs.has(slug)) {
        missing.push(`${locale}/${slug}`);
      }
    }
  }
  return { ok: missing.length === 0, missing };
}
