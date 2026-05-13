import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("docs workflow", () => {
  it("builds docs on PR and push without Pages deployment permissions", async () => {
    const workflow = await readFile(".github/workflows/docs.yml", "utf8");

    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("contents: read");
    expect(workflow).not.toContain("pages: write");
    expect(workflow).not.toContain("id-token: write");
    expect(workflow).not.toContain("github-pages");
    expect(workflow).not.toContain("BAIPIAO_DOCS_BASE_PATH");
    expect(workflow).toContain("pnpm docs:build");
  });
});
