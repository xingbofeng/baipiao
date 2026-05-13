import type { DocsPageSlug } from "../i18n/content.js";
import type { DocsLocale } from "../i18n/index.js";

export function renderMarkdown(markdown: string, slug: DocsPageSlug, locale: DocsLocale): string {
  const source = stripFrontMatter(markdown).replace(/\r?\n/g, "\n").trim();
  const lines = source.split("\n");
  const rendered: string[] = [];

  let paragraph: string[] = [];
  let currentList: "ul" | "ol" | null = null;
  let codeFenceLang = "";
  let codeLines: string[] = [];
  let inCodeFence = false;
  let skippedDocumentTitle = false;
  let tableRows: string[][] = [];
  let inTable = false;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      const text = paragraph.join(" ").trim();
      rendered.push(`<p>${renderInlineMarkdown(text)}</p>`);
      paragraph = [];
    }
  };

  const closeList = () => {
    if (currentList === "ul") {
      rendered.push("</ul>");
      currentList = null;
    } else if (currentList === "ol") {
      rendered.push("</ol>");
      currentList = null;
    }
  };

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) {
      return;
    }
    const html: string[] = ['<div class="table-scroll"><table>'];
    for (let i = 0; i < tableRows.length; i++) {
      const cells = tableRows[i]!;
      if (i === 1 && cells.every(isTableSeparatorCell)) {
        continue;
      }
      const tag = i === 0 ? "th" : "td";
      html.push("<tr>");
      for (const cell of cells) {
        html.push(`<${tag}>${renderInlineMarkdown(cell.trim())}</${tag}>`);
      }
      html.push("</tr>");
    }
    html.push("</table></div>");
    rendered.push(html.join(""));
    tableRows = [];
    inTable = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (!inCodeFence) {
        closeList();
        flushParagraph();
        inCodeFence = true;
        codeFenceLang = trimmed.slice(3).trim();
        codeLines = [];
      } else {
        rendered.push(renderCodeBlock(codeLines.join("\n"), codeFenceLang, locale));
        inCodeFence = false;
        codeFenceLang = "";
        codeLines = [];
      }
      continue;
    }

    if (inCodeFence) {
      codeLines.push(line);
      continue;
    }

    const tableRowMatch = /^\|(.*)\|$/.exec(trimmed);
    if (tableRowMatch) {
      closeList();
      flushParagraph();
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      const cells = splitMarkdownTableRow(tableRowMatch[1]!);
      tableRows.push(cells);
      continue;
    }

    if (inTable) {
      flushTable();
    }

    if (trimmed === "") {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      closeList();
      flushParagraph();
      if (!skippedDocumentTitle && headingMatch[1] === "#") {
        skippedDocumentTitle = true;
        continue;
      }
      const title = headingMatch[2]!;
      const level = Math.min(3, headingMatch[1]!.length);
      const tag = `h${Math.min(level + 1, 3)}` as "h2" | "h3" | "h4";
      const id = headingToId(slug, locale, title);
      rendered.push(`<${tag} id="${id}">${renderInlineMarkdown(title)}</${tag}>`);
      continue;
    }

    const orderedMatch = /^(\d+)\.\s+(.+)$/.exec(trimmed);
    if (orderedMatch) {
      if (currentList !== "ol") {
        closeList();
        flushParagraph();
        currentList = "ol";
        rendered.push("<ol>");
      }
      rendered.push(`<li>${renderInlineMarkdown(orderedMatch[2]!)}</li>`);
      continue;
    }

    const unorderedMatch = /^[-*+]\s+(.+)$/.exec(trimmed);
    if (unorderedMatch) {
      if (currentList !== "ul") {
        closeList();
        flushParagraph();
        currentList = "ul";
        rendered.push("<ul>");
      }
      rendered.push(`<li>${renderInlineMarkdown(unorderedMatch[1]!)}</li>`);
      continue;
    }

    if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
      closeList();
      flushParagraph();
      rendered.push(line);
      continue;
    }

    paragraph.push(trimmed);
  }

  if (inCodeFence) {
    rendered.push(renderCodeBlock(codeLines.join("\n"), "", locale));
  }
  flushTable();
  flushParagraph();
  closeList();

  return rendered.join("\n");
}

function renderCodeBlock(value: string, language: string, locale: DocsLocale): string {
  const label = language || "text";
  const copyLabel = getCodeCopyLabel(locale);
  return [
    '<div class="markdown-code-block">',
    '<div class="markdown-code-header">',
    `<span>${escapeHtml(label)}</span>`,
    `<button type="button" class="markdown-code-copy" data-copy-code="${escapeHtmlAttribute(value)}">${copyLabel}</button>`,
    "</div>",
    `<pre><code${language ? ` class="language-${escapeHtmlAttribute(language)}"` : ""}>${escapeHtml(value)}</code></pre>`,
    "</div>"
  ].join("");
}

export function stripFrontMatter(markdown: string): string {
  const normalized = markdown.trim();
  if (!normalized.startsWith("---")) {
    return normalized;
  }

  const end = normalized.indexOf("\n---", 3);
  if (end === -1) {
    return normalized;
  }

  return normalized.slice(end + 4).trimStart();
}

function getCodeCopyLabel(locale: DocsLocale): string {
  return {
    "zh-CN": "复制",
    en: "Copy",
    ja: "コピー",
    ko: "복사",
    fr: "Copier",
    es: "Copiar"
  }[locale];
}

export function headingToId(slug: DocsPageSlug, locale: DocsLocale, title: string): string {
  const normalized = title.trim().replace(/^\d+\.\s*/, "").trim();
  const lower = normalized.toLowerCase();

  if (locale === "zh-CN") {
    if (normalized.includes("概览")) return "overview";
    if (normalized.includes("先读这页") || normalized.includes("命令矩阵") || normalized.includes("工具清单")) {
      return "commands";
    }
    if (normalized.includes("典型流程") || normalized.includes("流程")) {
      return "flow";
    }
    if (normalized.includes("状态机")) return "state";
    if (normalized.includes("安全边界")) return "security";
    if (normalized.includes("安装")) return "install";
    if (normalized.includes("下一步")) return "next";
  } else {
    if (lower.includes("overview")) return "overview";
    if (lower.includes("read first") || lower.includes("command matrix") || lower.includes("tool contracts")) {
      return "commands";
    }
    if (lower.includes("typical flow") || lower.includes("flow")) return "flow";
    if (lower.includes("state machine")) return "state";
    if (lower.includes("security") || lower.includes("boundary")) return "security";
    if (lower.includes("install")) return "install";
    if (lower.includes("next")) return "next";
  }

  if (slug === "index" && (lower.includes("next") || normalized.includes("下一步"))) return "next";
  return slugify(normalized);
}

export function markdownToPlainText(markdown: string): string {
  return stripFrontMatter(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_|`~:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderInlineMarkdown(value: string): string {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match: string, alt: string, src: string) => `<img src="${src}" alt="${alt}" />`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match: string, label: string, href: string) => `<a href="${href}">${label}</a>`);
}

function splitMarkdownTableRow(value: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inCodeSpan = false;
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      cell += char === "|" ? "|" : `\\${char}`;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "`") {
      inCodeSpan = !inCodeSpan;
      cell += char;
      continue;
    }

    if (char === "|" && !inCodeSpan) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  if (escaped) {
    cell += "\\";
  }
  cells.push(cell.trim());
  return cells;
}

function isTableSeparatorCell(value: string): boolean {
  return /^:?-{3,}:?$/.test(value.trim());
}

function slugify(value: string): string {
  const safe = value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-+|-+$)/g, "");
  return safe || "section";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
