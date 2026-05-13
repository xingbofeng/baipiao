import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "./index.js";

let tmpPaths: string[] = [];

afterEach(async () => {
  await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
  tmpPaths = [];
});

describe("CLI presentation snapshots", () => {
  it("matches init command output snapshot with full wordmark", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "init", "--name", "Demo App"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      terminal: {
        env: { NO_COLOR: "1" },
        tty: true,
        width: 96
      }
    });

    expect(code).toBe(0);
    const text = output.join("\n");
    expect(text).toMatchSnapshot();
    expect(text).toContain("BAIPIAO");
  });

  it("falls back to compact brand for non-TTY init output", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "init", "--name", "Demo App"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      terminal: {
        tty: false,
        width: 60
      }
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("baipiao");
    expect(text).not.toContain("████");
    expect(text).not.toContain("BAIPIAO");
    expect(text).toContain("Project initialized");
  });

  it("matches search command output snapshot", async () => {
    const output: string[] = [];
    const code = await runCli(["node", "baipiao", "search", "llm"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    const text = output.join("\n");
    expect(text).toMatchSnapshot();
    expect(text).not.toContain("BAIPIAO");
  });

  it("keeps search quick actions in constrained non-tty output", async () => {
    const output: string[] = [];
    const code = await runCli(["node", "baipiao", "search", "llm"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      terminal: {
        tty: false,
        width: 60
      }
    });
    const text = output.join("\n");

    expect(code).toBe(0);
    expect(text).toContain("$ baipiao search llm");
    expect(text).toContain("baipiao search database");
    expect(text).toContain("Quick filters");
    expect(text).not.toContain("BAIPIAO");
  });

  it("prints detected language for localized search queries", async () => {
    const output: string[] = [];
    const code = await runCli(["node", "baipiao", "search", "数据库"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("Detected language: zh-CN");
    expect(text).toContain("database");
  });

  it("matches setup success command output snapshot", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Setup App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "setup", "groq", "--input", "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      testFetch: () => Promise.resolve(new Response("{}", { status: 200 }))
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toMatchSnapshot();
    expect(text).not.toContain("gsk_abcdefghijklmnopqrstuvwxyz1234");
    expect(text).not.toContain("BAIPIAO");
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe("GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234\n");
  });

  it("matches setup waiting command output snapshot", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "setup", "groq"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toMatchSnapshot();
    expect(text).toContain("Waiting for Agent output.");
    expect(text).not.toContain("BAIPIAO");
  });

  it("copies setup prompt when clipboard is available", async () => {
    const output: string[] = [];
    const clipboard: string[] = [];

    const code = await runCli(["node", "baipiao", "setup", "groq"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      writeClipboard: (text) => {
        clipboard.push(text);
      }
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(clipboard).toHaveLength(1);
    expect(text).toContain("Prompt copied to clipboard.");
    expect(text).toContain("Waiting for Agent output.");
    expect(clipboard[0]).toContain("GROQ_API_KEY=...");
  });

  it("matches status command output snapshot", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Status App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli(["node", "baipiao", "setup", "groq", "--input", "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
      testFetch: () => Promise.resolve(new Response("{}", { status: 200 }))
    });
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "status"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toMatchSnapshot();
    expect(text).not.toContain("BAIPIAO");
  });
});
