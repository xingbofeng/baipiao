import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

import {
  applyFreeForDevCatalogTranslations,
  freeForDevCatalogLocales,
  getFreeForDevCatalogCategories,
  getFreeForDevCatalogTranslationBatch,
  searchFreeForDevCatalog,
  type FreeForDevCatalogLocale
} from "baipiao-core";

export type CatalogCliIO = {
  cwd: string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
};

export async function runCatalogCommand(args: string[], io: CatalogCliIO): Promise<number | undefined> {
  const command = args[0];
  const subcommand = args[1];
  if (command !== "catalog") {
    return undefined;
  }

  if (subcommand === "candidates") {
    const locale = readLocale(args);
    if (args.includes("--locale") && !locale) {
      io.stderr("Unsupported locale. Use en, zh-CN, ja, ko, fr, or es.");
      return 1;
    }
    const limit = readNumberFlag(args, "--limit");
    const offset = readNumberFlag(args, "--offset") ?? 0;
    const query = readFlagValue(args, "--query") ?? readPositionalCatalogCandidateQuery(args);
    const category = readFlagValue(args, "--category");
    const sourceCategory = readFlagValue(args, "--source-category");
    const systemLocale = process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG;
    const result = await searchFreeForDevCatalog(io.cwd, {
      ...(query === undefined ? {} : { query }),
      ...(category === undefined ? {} : { category }),
      ...(sourceCategory === undefined ? {} : { sourceCategory }),
      ...(locale === undefined ? {} : { locale }),
      ...(systemLocale === undefined ? {} : { systemLocale }),
      ...(limit === undefined ? {} : { limit }),
      offset
    });
    io.stdout([
      "$ baipiao catalog candidates",
      "",
      `total: ${result.total}`,
      `limit: ${result.limit}`,
      `offset: ${result.offset}`,
      `locale: ${result.requestedLocale}`,
      "",
      "ID  NAME  CATEGORY  SOURCE_CATEGORY  URL  FREE_TIER_STATUS  REVIEW  LOCALE  TRANSLATION",
      ...(result.items.length > 0
        ? result.items.map((item) => [
          item.id,
          item.name,
          item.category,
          item.sourceCategory,
          item.url,
          item.freeTierStatus,
          item.reviewStatus,
          item.locale,
          item.translationStatus
        ].join("  "))
        : ["No candidates found."])
    ].join("\n"));
    return 0;
  }

  if (subcommand === "categories") {
    const categories = await getFreeForDevCatalogCategories(io.cwd);
    io.stdout([
      "$ baipiao catalog categories",
      "",
      `total: ${categories.total}`,
      "",
      "CATEGORY  COUNT",
      ...categories.categories.map((category) => `${category.name}  ${category.count}`),
      "",
      "SOURCE_CATEGORY  COUNT",
      ...categories.sourceCategories.map((category) => `${category.name}  ${category.count}`)
    ].join("\n"));
    return 0;
  }

  if (subcommand === "localize") {
    const locale = readLocale(args);
    const inputPath = readFlagValue(args, "--input");
    if (!locale || locale === "en") {
      io.stderr("Missing or unsupported translation locale. Use --locale zh-CN, ja, ko, fr, or es.");
      return 1;
    }
    if (!inputPath) {
      io.stderr("Missing translation input. Use --input <path>.");
      return 1;
    }
    const parsed = JSON.parse(await readFile(resolveCliPath(io.cwd, inputPath), "utf8")) as {
      translations?: Array<{ id: string; name?: string; description?: string; freeTierText?: string }>;
    };
    const summary = await applyFreeForDevCatalogTranslations(io.cwd, {
      locale,
      translations: parsed.translations ?? [],
      translatedAt: new Date().toISOString()
    });
    io.stdout([
      "$ baipiao catalog localize",
      "",
      `locale: ${locale}`,
      `updated: ${summary.updated}`,
      `missing: ${summary.missing.length}`,
      ...(summary.missing.length > 0 ? [`missingIds: ${summary.missing.join(", ")}`] : [])
    ].join("\n"));
    return 0;
  }

  if (subcommand === "translation-batch") {
    const locale = readLocale(args);
    if (!locale || locale === "en") {
      io.stderr("Missing or unsupported translation locale. Use --locale zh-CN, ja, ko, fr, or es.");
      return 1;
    }
    const batch = await getFreeForDevCatalogTranslationBatch(io.cwd, {
      locale,
      ...(readFlagValue(args, "--query") === undefined ? {} : { query: readFlagValue(args, "--query") }),
      ...(readFlagValue(args, "--category") === undefined ? {} : { category: readFlagValue(args, "--category") }),
      ...(readFlagValue(args, "--source-category") === undefined ? {} : { sourceCategory: readFlagValue(args, "--source-category") }),
      ...(readNumberFlag(args, "--limit") === undefined ? {} : { limit: readNumberFlag(args, "--limit") }),
      offset: readNumberFlag(args, "--offset") ?? 0,
      untranslatedOnly: !args.includes("--include-translated")
    });
    io.stdout(JSON.stringify(batch, null, 2));
    return 0;
  }

  return undefined;
}

function readFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function readNumberFlag(args: string[], flag: string): number | undefined {
  const value = readFlagValue(args, flag);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readLocale(args: string[]): FreeForDevCatalogLocale | undefined {
  const locale = readFlagValue(args, "--locale");
  if (locale === undefined) {
    return undefined;
  }
  return freeForDevCatalogLocales.includes(locale as FreeForDevCatalogLocale)
    ? locale as FreeForDevCatalogLocale
    : undefined;
}

function readPositionalCatalogCandidateQuery(args: string[]): string | undefined {
  const value = args[2];
  return value && !value.startsWith("--") ? value : undefined;
}

function resolveCliPath(cwd: string, value: string): string {
  return isAbsolute(value) ? value : join(cwd, value);
}
