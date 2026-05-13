export const docsLocales = ["zh-CN", "en", "ja", "ko", "fr", "es"] as const;

export type DocsLocale = (typeof docsLocales)[number];
