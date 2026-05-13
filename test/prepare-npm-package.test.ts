import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

describe("prepare npm package", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("copies only runtime registry artifacts for baipiao-core packages", async () => {
    const packageRoot = await mkdtemp(join(tmpdir(), "baipiao-pack-"));
    tempDirs.push(packageRoot);

    await runPreparePackage(packageRoot, "baipiao-core");

    await expect(readFile(join(packageRoot, "registry", "configs", "groq.yaml"), "utf8"))
      .resolves.toContain("id: groq");
    await expect(readFile(join(packageRoot, "registry", "catalog", "services.json"), "utf8"))
      .resolves.toContain("\"id\": \"groq\"");
    await expect(readFile(join(packageRoot, "registry", "sources", "free-for-dev", "normalized.json"), "utf8"))
      .resolves.toContain("baipiao.normalized-catalog.v1");
    await expect(readFile(join(packageRoot, "registry", "sources", "free-for-dev", "raw", "20260512T120850953Z.md"), "utf8"))
      .rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(join(packageRoot, "registry", "sources", "free-for-dev", "snapshots", "20260512T120850953Z.json"), "utf8"))
      .rejects.toMatchObject({ code: "ENOENT" });
  });
});

async function runPreparePackage(cwd: string, packageName: string): Promise<void> {
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "stale", "utf8");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), "scripts", "prepare-npm-package.mjs")], {
      cwd,
      env: {
        ...process.env,
        npm_package_name: packageName
      },
      stdio: "pipe"
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `prepare script exited with ${code}`));
      }
    });
  });
}
