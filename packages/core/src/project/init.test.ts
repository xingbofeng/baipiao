import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { initializeProject, loadProjectConfig } from "./init.js";

let tmpPaths: string[] = [];

describe("project initialization", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("creates the local baipiao project files without secrets", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-init-"));
    tmpPaths.push(cwd);

    const result = await initializeProject({ cwd, name: "My AI Tool", type: "ai_saas" });

    expect(result.createdFiles).toEqual([
      ".baipiao/project.json",
      ".baipiao/services.json",
      ".env.local",
      ".env.example"
    ]);
    const project = JSON.parse(await readFile(join(cwd, ".baipiao", "project.json"), "utf8")) as {
      name: string;
      slug: string;
      type: string;
      envPath: string;
    };
    expect(project).toMatchObject({
      name: "My AI Tool",
      slug: "my-ai-tool",
      type: "ai_saas",
      envPath: ".env.local"
    });
    expect(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")).toContain('"services": []');
    expect(await readFile(join(cwd, ".env.example"), "utf8")).toBe("");
  });

  it("does not overwrite existing env files", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-init-"));
    tmpPaths.push(cwd);
    await writeFile(join(cwd, ".env.local"), "EXISTING=value\n", "utf8");

    const result = await initializeProject({ cwd, name: "Existing App", type: "custom" });

    expect(result.createdFiles).not.toContain(".env.local");
    expect(result.skippedFiles).toContain(".env.local");
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe("EXISTING=value\n");
  });

  it("loads project config and reports PROJECT_NOT_INITIALIZED when missing", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-load-project-"));
    tmpPaths.push(cwd);

    await expect(loadProjectConfig(cwd)).rejects.toMatchObject({
      code: "PROJECT_NOT_INITIALIZED"
    });

    await initializeProject({ cwd, name: "Loaded App", type: "rag" });

    await expect(loadProjectConfig(cwd)).resolves.toMatchObject({
      name: "Loaded App",
      slug: "loaded-app",
      type: "rag",
      envPath: ".env.local"
    });
  });
});
