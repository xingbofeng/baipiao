import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const rootArtifacts = {
  snapshots: [
    "packages/cli/src/__snapshots__/cli-presentation-snapshot.test.ts.snap",
    "packages/cli/src/renderers/__snapshots__/presentation-snapshot.test.ts.snap"
  ],
  fixtureFiles: [
    "test/fixtures/files/service-configs/example-llm.yaml",
    "test/fixtures/files/agent-outputs/groq-success.md",
    "test/fixtures/files/env/.env.local",
    "test/fixtures/files/env/.env.example",
    "test/fixtures/files/mcp-responses/generate-setup-prompt.success.json",
    "test/fixtures/files/mcp-responses/vault-list.success.json",
    "test/fixtures/files/error-outputs/cli-error.json",
    "test/fixtures/files/error-outputs/mcp-error.json",
    "test/fixtures/files/masked-outputs/setup-archive.md",
    "test/fixtures/files/masked-outputs/terminal-output.txt",
    "test/fixtures/files/.baipiao/outputs/groq.md",
    "test/fixtures/files/logs/cli.log"
  ]
} as const;

describe("artifacts and snapshots are secret-safe", () => {
  it("keeps snapshots secret-safe for production-like patterns", async () => {
    for (const relativePath of rootArtifacts.snapshots) {
      const text = await readFixture(relativePath);
      expect(text).not.toMatch(secretShapePattern);
      expect(text).not.toContain("fixture-real-secret");
      expect(text).not.toContain("baipiao-secret");
    }
  });

  it("keeps fixture and output artifacts safe for logs, fixtures, and .baipiao/outputs examples", async () => {
    for (const relativePath of rootArtifacts.fixtureFiles) {
      const text = await readFixture(relativePath);
      expect(text).not.toMatch(secretShapePattern);
      expect(text).not.toMatch(localPathPattern);
      expect(text).not.toMatch(/BEGIN PRIVATE KEY/i);
      expect(text.trim()).not.toBe("");
    }
  });
});

async function readFixture(relativePath: string): Promise<string> {
  return readFile(join(process.cwd(), relativePath), "utf8");
}

const secretShapePattern =
  /gsk_[A-Za-z0-9_]{8,}|sk-or-v1-[A-Za-z0-9_-]{8,}|AKIA[A-Za-z0-9]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i;

const localPathPattern = /\/Users\/|[A-Z]:\\/;
