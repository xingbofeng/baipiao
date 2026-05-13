import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../packages/cli/src/index.js";

let tmpPaths: string[] = [];

describe("PRD end-to-end acceptance scripts", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("validates core user stories: init, search, prompt, setup, status, and vault list", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-prd-e2e-"));
    tmpPaths.push(cwd);
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const output: string[] = [];

    const initCode = await runCli(["node", "baipiao", "init", "--name", "PRD Demo App"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      terminal: { env: {}, tty: true, width: 96 }
    });
    expect(initCode).toBe(0);
    expect(output.join("\n")).toContain("Project initialized");
    expect(await readFile(join(cwd, ".baipiao", "project.json"), "utf8")).toContain("PRD Demo App");
    expect(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")).toContain("services");

    output.length = 0;
    const searchCode = await runCli(["node", "baipiao", "search", "openruter"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(searchCode).toBe(0);
    expect(output.join("\n")).toContain("OpenRouter");

    output.length = 0;
    const promptCode = await runCli(["node", "baipiao", "prompt", "groq"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(promptCode).toBe(0);
    expect(output.join("\n")).toContain("GROQ_API_KEY=...");

    output.length = 0;
    const setupCode = await runCli([
      "node",
      "baipiao",
      "setup",
      "groq",
      "--input",
      `GROQ_API_KEY=${secret}`
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      testFetch: () => Promise.resolve(new Response("{}", { status: 200 }))
    });
    expect(setupCode).toBe(0);
    expect(output.join("\n")).toContain("State: tested");
    expect(output.join("\n")).toContain("added to .env.local");
    expect(output.join("\n")).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe(`GROQ_API_KEY=${secret}\n`);
    expect(await readFile(join(cwd, ".baipiao", "outputs", "groq.md"), "utf8")).toContain("GROQ_API_KEY=gsk_**************************1234");

    output.length = 0;
    const statusCode = await runCli(["node", "baipiao", "status"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(statusCode).toBe(0);
    expect(output.join("\n")).toContain("Project");
    expect(output.join("\n")).toContain("Vault");

    output.length = 0;
    const vaultCode = await runCli(["node", "baipiao", "vault", "list"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(vaultCode).toBe(0);
    expect(output.join("\n")).toContain("GROQ_API_KEY");
    expect(output.join("\n")).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(output.join("\n")).not.toContain("gsk_");
  });
});
