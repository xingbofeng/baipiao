export function getDocsBasePath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.BAIPIAO_DOCS_BASE_PATH?.trim();
  if (!configured || configured === "/") {
    return "/";
  }

  const withLeadingSlash = configured.startsWith("/") ? configured : `/${configured}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}
