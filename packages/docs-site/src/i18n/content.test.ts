import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { docsPages, validateDocsContentShape } from "./content.js";
import { docsLocales } from "./index.js";

describe("docs content i18n shape", () => {
  it("keeps all locale pages slug-aligned", () => {
    expect(docsPages["zh-CN"].map((page) => page.slug)).toEqual([
      "index",
      "registry",
      "cli",
      "mcp"
    ]);
    for (const locale of docsLocales) {
      expect(docsPages[locale].map((page) => page.slug)).toEqual(docsPages["zh-CN"].map((page) => page.slug));
    }
    expect(validateDocsContentShape()).toEqual({ ok: true, missing: [] });
  });

  it("marks unfinished English pages as translation_pending instead of dropping pages", () => {
    expect(docsPages.en.some((page) => page.translationStatus === "translation_pending")).toBe(true);
  });

  it("does not keep unreachable markdown pages in content directories", async () => {
    for (const locale of docsLocales) {
      const files = await readdir(join("packages/docs-site/content", locale));
      expect(files.filter((file) => file.endsWith(".md")).sort()).toEqual(
        docsPages[locale].map((page) => `${page.slug}.md`).sort()
      );
    }
  });

  it("marks planned localized docs as translated", () => {
    for (const locale of ["ja", "ko", "fr", "es"] as const) {
      expect(docsPages[locale].every((page) => page.translationStatus === "translated")).toBe(true);
    }
  });
});
