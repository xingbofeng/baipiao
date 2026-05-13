import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { refreshFreeForDevSource } from "./freeForDev.js";

let tmpPaths: string[] = [];

const markdown = `# free-for-dev

## Generative AI

* [Groq](https://groq.com/) - Fast inference API with a free tier.
`;

describe("free-for-dev refresh", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("writes raw, normalized, source metadata, and import snapshot artifacts", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-ffd-"));
    tmpPaths.push(cwd);

    const result = await refreshFreeForDevSource({
      cwd,
      now: "2026-05-12T00:00:00.000Z",
      fetchText: () => Promise.resolve({
        text: markdown,
        etag: "etag-1",
        commitSha: "commit-1"
      })
    });

    expect(result).toMatchObject({
      imported: 1,
      updated: 1,
      skipped: 0,
      needsReview: 1,
      errors: 0,
      stale: false
    });
    expect(await readFile(join(cwd, "registry/sources/free-for-dev/source.json"), "utf8")).toContain("etag-1");
    expect(await readFile(join(cwd, result.rawSnapshotPath), "utf8")).toBe(markdown);
    expect(await readFile(join(cwd, "registry/sources/free-for-dev/normalized.json"), "utf8")).toContain('"groq"');
    expect(await readFile(join(cwd, result.importSnapshotPath), "utf8")).toContain("baipiao.normalized-catalog.v1");
  });

  it("uses existing cached artifacts and marks the source stale when fetch fails", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-ffd-"));
    tmpPaths.push(cwd);
    const first = await refreshFreeForDevSource({
      cwd,
      now: "2026-05-12T00:00:00.000Z",
      fetchText: () => Promise.resolve({
        text: markdown,
        etag: "etag-1",
        commitSha: "commit-1"
      })
    });
    const previousNormalized = await readFile(join(cwd, "registry/sources/free-for-dev/normalized.json"), "utf8");

    const result = await refreshFreeForDevSource({
      cwd,
      now: "2026-05-13T00:00:00.000Z",
      fetchText: () => Promise.reject(new Error("network unavailable with token abc123"))
    });

    expect(result).toMatchObject({
      imported: 0,
      updated: 0,
      errors: 1,
      stale: true,
      rawSnapshotPath: first.rawSnapshotPath,
      importSnapshotPath: first.importSnapshotPath
    });
    expect(await readFile(join(cwd, "registry/sources/free-for-dev/normalized.json"), "utf8")).toBe(previousNormalized);
    const source = await readFile(join(cwd, "registry/sources/free-for-dev/source.json"), "utf8");
    expect(source).toContain("\"lastStatus\": \"stale\"");
    expect(source).toContain("\"stale\": true");
    expect(source).not.toContain("token abc123");
  });

  it("sends cached etag and keeps artifacts unchanged when upstream is not modified", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-ffd-"));
    tmpPaths.push(cwd);
    const first = await refreshFreeForDevSource({
      cwd,
      now: "2026-05-12T00:00:00.000Z",
      fetchText: () => Promise.resolve({
        text: markdown,
        etag: "etag-1",
        commitSha: "commit-1"
      })
    });
    const normalizedPath = join(cwd, "registry/sources/free-for-dev/normalized.json");
    const previousNormalized = await readFile(normalizedPath, "utf8");
    const previousMtime = (await stat(normalizedPath)).mtimeMs;
    let ifNoneMatch: string | undefined;

    const result = await refreshFreeForDevSource({
      cwd,
      now: "2026-05-13T00:00:00.000Z",
      fetchText: (_url, options) => {
        ifNoneMatch = options?.ifNoneMatch;
        return Promise.resolve({ notModified: true });
      }
    });

    expect(ifNoneMatch).toBe("etag-1");
    expect(result).toMatchObject({
      imported: 0,
      updated: 0,
      skipped: 0,
      needsReview: 1,
      errors: 0,
      stale: false,
      rawSnapshotPath: first.rawSnapshotPath,
      importSnapshotPath: first.importSnapshotPath
    });
    expect(await readFile(normalizedPath, "utf8")).toBe(previousNormalized);
    expect((await stat(normalizedPath)).mtimeMs).toBe(previousMtime);
    const source = await readFile(join(cwd, "registry/sources/free-for-dev/source.json"), "utf8");
    expect(source).toContain("\"lastStatus\": \"not_modified\"");
  });
});
