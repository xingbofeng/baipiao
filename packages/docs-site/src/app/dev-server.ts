export async function startDocsDevServer(): Promise<void> {
  // Placeholder keeps the docs-site package buildable while the site is implemented.
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startDocsDevServer();
}
