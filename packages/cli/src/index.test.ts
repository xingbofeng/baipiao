import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { MemoryVaultService } from "baipiao-core";
import { createDefaultCliIO, runCli } from "./index.js";

let tmpPaths: string[] = [];

describe("baipiao CLI", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("prints help with the documented command surface", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "--help"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("baipiao init");
    expect(output.join("\n")).toContain("baipiao search <query>");
    expect(output.join("\n")).toContain("baipiao prompt <service>");
    expect(output.join("\n")).toContain("baipiao setup-stack <stack>");
    expect(output.join("\n")).toContain("baipiao catalog <candidates|categories|localize|translation-batch|refresh|sources|review>");
    expect(output.join("\n")).toContain("baipiao mcp install <cursor|claude|codex>");
    expect(output.join("\n")).toContain("baipiao mcp [--stdio]");
    expect(output.join("\n")).toContain("baipiao mcp --port 7331");
  });

  it("prints the package version", async () => {
    const output: string[] = [];
    const pkg = JSON.parse(await readFile(join(process.cwd(), "packages", "cli", "package.json"), "utf8")) as {
      version: string;
    };

    const code = await runCli(["node", "baipiao", "--version"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toBe(pkg.version);
    expect(output.join("\n")).not.toBe("0.0.0");
    expect(output.join("\n")).not.toContain("Unknown command");
  });

  it("wires clipboard support in the default CLI IO", () => {
    const io = createDefaultCliIO();

    expect(typeof io.writeClipboard).toBe("function");
  });

  it("runs init through the design-aligned renderer", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "init", "--name", "CLI App"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      terminal: { env: {}, tty: true, width: 96 }
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("BAIPIAO");
    expect(output.join("\n")).toContain("Project initialized");
    expect(output.join("\n")).toContain(".baipiao/project.json");
  });

  it("searches the full free-for-dev catalog by default with fuzzy matching", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "search", "openruter"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("$ baipiao search openruter");
    expect(output.join("\n")).toContain("OpenRouter");
    expect(output.join("\n")).toContain("Quick filters");
  });

  it("prints structured service info", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "info", "groq"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Groq");
    expect(output.join("\n")).toContain("https://console.groq.com/keys");
    expect(output.join("\n")).toContain("GROQ_API_KEY");
    expect(output.join("\n")).toContain("openai_compatible_chat");
  });

  it("prints setup prompts", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "prompt", "groq"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("https://console.groq.com/keys");
    expect(output.join("\n")).toContain("GROQ_API_KEY=...");
    expect(output.join("\n")).toContain("Do not click Billing");
  });

  it("copies setup prompts to clipboard when requested", async () => {
    const output: string[] = [];
    const clipboard: string[] = [];

    const code = await runCli(["node", "baipiao", "prompt", "groq", "--copy"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      writeClipboard: (text) => {
        clipboard.push(text);
      }
    });

    expect(code).toBe(0);
    expect(clipboard).toHaveLength(1);
    expect(clipboard[0]).toContain("https://console.groq.com/keys");
    expect(clipboard[0]).toContain("GROQ_API_KEY=...");
    expect(output.join("\n")).toContain("Copied prompt to clipboard.");
  });

  it("prints generic setup prompts for free-for-dev normalized candidates", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, "normalized.json"), `${JSON.stringify({
      items: [
        {
          id: "free-for-dev:generative-ai:demo-ai",
          name: "Demo AI",
          slug: "demo-ai",
          category: "llm",
          sourceCategory: "Generative AI",
          description: "Demo free AI API.",
          url: "https://example.com",
          capability: ["prompt"],
          freeTierText: "Free tier available with review.",
          freeTierStatus: "free_tier",
          source: {
            id: "free-for-dev",
            url: "https://github.com/ripienaar/free-for-dev",
            rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
            importedAt: "2026-05-13T00:00:00.000Z"
          },
          rawExcerptRef: {
            path: "registry/sources/free-for-dev/raw/sample.md",
            lineStart: 1,
            lineEnd: 1
          },
          confidence: "medium",
          reviewStatus: "needs_review",
          warnings: ["External source requires manual review."]
        }
      ]
    }, null, 2)}\n`, "utf8");
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "prompt", "free-for-dev:generative-ai:demo-ai"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("Demo AI");
    expect(text).toContain("https://example.com");
    expect(text).toContain("Free tier available with review.");
    expect(text).toContain("External source requires manual review.");
    expect(text).toContain("KEY=VALUE");
  });

  it("resolves free-for-dev candidates by loose user-facing aliases", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "prompt", "huggingface"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("huggingface.co");
    expect(text).toContain("External catalog source: free-for-dev");
  });

  it("skips connection tests for free-for-dev catalog-only candidates", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "test", "huggingface"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("huggingface.co");
    expect(text).toContain("Status: skipped");
    expect(text).toContain("Connection test is not supported");
  });

  it("updates project state when prompt is generated inside an initialized project", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Prompt App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    const code = await runCli(["node", "baipiao", "prompt", "groq"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    expect(code).toBe(0);
    const services = JSON.parse(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")) as {
      services: Array<{ serviceId: string; state: string }>;
    };
    expect(services.services).toContainEqual(expect.objectContaining({
      serviceId: "groq",
      state: "prompt_generated"
    }));
  });

  it("runs setup with provided Agent output without leaking full secret and updates state", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    await runCli(["node", "baipiao", "init", "--name", "Setup App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    const code = await runCli([
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

    expect(code).toBe(0);
    const text = output.join("\n");
    expect(text).toContain("GROQ_API_KEY=gsk_**************************1234");
    expect(text).toContain("added to .env.local");
    expect(output.join("\n")).toContain("Saved to Vault");
    expect(output.join("\n")).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(await readFile(join(cwd, ".baipiao", "outputs", "groq.md"), "utf8")).toContain(
      "GROQ_API_KEY=gsk_**************************1234"
    );
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe(`GROQ_API_KEY=${secret}\n`);
    expect(await readFile(join(cwd, ".baipiao", "outputs", "groq.md"), "utf8")).not.toContain(
      "abcdefghijklmnopqrstuvwxyz1234"
    );
    const services = JSON.parse(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")) as {
      services: Array<{ serviceId: string; state: string }>;
    };
    expect(services.services).toContainEqual(expect.objectContaining({
      serviceId: "groq",
      state: "tested"
    }));
  });

  it("returns failure and does not sync env when setup connection testing fails", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    await runCli(["node", "baipiao", "init", "--name", "Failed Setup App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    const code = await runCli([
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
      testFetch: () => Promise.resolve(new Response("unauthorized", { status: 401 }))
    });

    const text = output.join("\n");
    const services = JSON.parse(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")) as {
      services: Array<{ serviceId: string; state: string; envKeys: string[]; lastError?: string }>;
    };
    expect(code).toBe(1);
    expect(text).toContain("State: failed");
    expect(text).toContain("OpenAI-compatible chat test failed with status 401.");
    expect(text).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe("");
    expect(services.services).toContainEqual(expect.objectContaining({
      serviceId: "groq",
      state: "failed",
      envKeys: ["GROQ_API_KEY"],
      lastError: "OpenAI-compatible chat test failed with status 401."
    }));

    output.length = 0;
    expect(await runCli(["node", "baipiao", "env", "generate"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    })).toBe(0);
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe("");
    expect(output.join("\n")).toContain("Skipped failed env value: GROQ_API_KEY");
  });

  it("runs interactive setup by copying the prompt, reading pasted Agent output, and retrying invalid output", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Interactive Setup"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];
    const clipboard: string[] = [];
    const prompts: string[] = [];
    const pasted = [
      "GROQ_API_KEY=bad",
      "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234"
    ];

    const code = await runCli(["node", "baipiao", "setup", "groq"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      testFetch: () => Promise.resolve(new Response("{}", { status: 200 })),
      writeClipboard: (text) => {
        clipboard.push(text);
      },
      readAgentOutput: (prompt) => {
        prompts.push(prompt);
        return Promise.resolve(pasted.shift() ?? "");
      }
    });

    const text = output.join("\n");
    const services = JSON.parse(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")) as {
      services: Array<{ serviceId: string; state: string }>;
    };
    expect(code).toBe(0);
    expect(clipboard).toHaveLength(1);
    expect(clipboard[0]).toContain("GROQ_API_KEY=...");
    expect(prompts).toEqual([
      "Paste Agent output for groq: ",
      "Paste Agent output for groq again: "
    ]);
    expect(text).toContain("Prompt copied to clipboard.");
    expect(text).toContain("Retry: SECRET_VALIDATION_FAILED");
    expect(text).toContain("State: tested");
    expect(text).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(services.services).toContainEqual(expect.objectContaining({
      serviceId: "groq",
      state: "tested"
    }));
  });

  it("runs generic setup interactively for prompt-only services", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "setup", "vercel"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      readAgentOutput: () => Promise.resolve("API Key: vercel_token_123")
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("State: configured_unverified");
    expect(output.join("\n")).toContain("VERCEL_API_KEY");
    expect(output.join("\n")).not.toContain("vercel_token_123");
  });

  it("runs generic setup with non-interactive input without copying prompt", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Generic Setup App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    const code = await runCli([
      "node",
      "baipiao",
      "setup",
      "vercel",
      "--input",
      "API Key: vercel_token_123"
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      testFetch: () => Promise.resolve(new Response("{}", { status: 200 }))
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("State: configured_unverified");
    expect(text).toContain("VERCEL_API_KEY");
    expect(text).not.toContain("vercel_token_123");
  });

  it("imports existing Agent output through output command", async () => {
    const output: string[] = [];
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Output App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    const code = await runCli([
      "node",
      "baipiao",
      "output",
      "groq",
      "--input",
      `GROQ_API_KEY=${secret}`
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      testFetch: () => Promise.resolve(new Response("{}", { status: 200 }))
    });

    expect(code).toBe(0);
    const text = output.join("\n");
    expect(text).toContain("State: tested");
    expect(text).toContain("GROQ_API_KEY");
    expect(output.join("\n")).toContain("added to .env.local");
    expect(output.join("\n")).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe(`GROQ_API_KEY=${secret}\n`);
  });

  it("prints project status with service groups, vault count, and quick actions", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Status App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli([
      "node",
      "baipiao",
      "setup",
      "groq",
      "--input",
      "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234"
    ], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
      testFetch: () => Promise.resolve(new Response("{}", { status: 200 }))
    });
    await runCli(["node", "baipiao", "prompt", "supabase"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "status"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao status");
    expect(text).toContain("Project");
    expect(text).toContain("Status App");
    expect(text).toContain("AI Services");
    expect(text).toContain("Backend Services");
    expect(text).toContain("Vault");
    expect(text).toContain("Groq");
    expect(text).toContain("tested");
    expect(text).toContain("Supabase");
    expect(text).toContain("prompt_generated");
    expect(text).toContain("1 keys stored");
    expect(text).toContain("baipiao test groq");
    expect(text).toContain("baipiao vault list");
    expect(text).toContain("baipiao env generate");
    expect(text).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });

  it("counts stored vault entries in status even when a service failed", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-status-vault-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Status Vault"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli([
      "node",
      "baipiao",
      "setup",
      "groq",
      "--input",
      "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234"
    ], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
      testFetch: () => Promise.resolve(new Response("unauthorized", { status: 401 }))
    });
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "status"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("1 keys stored");
  });

  it("prints stack recommendations from core", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "stack", "recommend", "ai_saas"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao stack recommend ai_saas");
    expect(text).toContain("AI SaaS basic free stack");
    expect(text).toContain("groq");
    expect(text).toContain("supabase");
    expect(text).toContain("baipiao setup-stack ai-basic");
  });

  it("generates setup prompts for a stack and tracks each service independently", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Stack App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "setup-stack", "ai-basic"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    const services = JSON.parse(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")) as {
      services: Array<{ serviceId: string; state: string }>;
    };
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao setup-stack ai-basic");
    expect(text).toContain("AI SaaS basic free stack");
    expect(text).toContain("## groq");
    expect(text).toContain("## supabase");
    expect(text).toContain("GROQ_API_KEY=...");
    expect(text).not.toContain("gsk_abcdefghijklmnopqrstuvwxyz1234");
    expect(services.services).toEqual(expect.arrayContaining([
      expect.objectContaining({ serviceId: "groq", state: "prompt_generated" }),
      expect.objectContaining({ serviceId: "supabase", state: "prompt_generated" }),
      expect.objectContaining({ serviceId: "vercel", state: "prompt_generated" })
    ]));
  });

  it("installs MCP config for Claude Code without secrets", async () => {
    const output: string[] = [];
    const calls: Array<{ file: string; args: string[] }> = [];

    const code = await runCli(["node", "baipiao", "mcp", "install", "claude"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      execFile: (file, args) => {
        calls.push({ file, args });
        return Promise.resolve({});
      }
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("Installed baipiao MCP for claude.");
    expect(calls).toEqual([
      { file: "claude", args: ["mcp", "remove", "--scope", "user", "baipiao"] },
      { file: "claude", args: ["mcp", "add", "--scope", "user", "baipiao", "--", "baipiao", "mcp"] }
    ]);
    expect(text).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("installs MCP config for Codex without secrets", async () => {
    const output: string[] = [];
    const calls: Array<{ file: string; args: string[] }> = [];

    const code = await runCli(["node", "baipiao", "mcp", "install", "codex", "--port", "7333"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      execFile: (file, args) => {
        calls.push({ file, args });
        return Promise.resolve({});
      }
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("Installed baipiao MCP for codex.");
    expect(calls).toEqual([
      { file: "codex", args: ["mcp", "remove", "baipiao"] },
      { file: "codex", args: ["mcp", "add", "baipiao", "--url", "http://127.0.0.1:7333/mcp"] }
    ]);
    expect(text).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("installs MCP config for Cursor without secrets", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "baipiao-home-"));
    tmpPaths.push(homeDir);
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "mcp", "install", "cursor"], {
      cwd: process.cwd(),
      homeDir,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    const cursorConfig = JSON.parse(await readFile(join(homeDir, ".cursor", "mcp.json"), "utf8")) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(code).toBe(0);
    expect(text).toContain("Installed baipiao MCP for cursor.");
    expect(cursorConfig.mcpServers.baipiao).toEqual({ command: "baipiao", args: ["mcp"] });
    expect(JSON.stringify(cursorConfig)).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("rejects invalid MCP port options in install and runtime entrypoints", async () => {
    const output: string[] = [];
    let code = await runCli(["node", "baipiao", "mcp", "install", "cursor", "--port", "0"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Invalid port number.");
    output.length = 0;

    code = await runCli(["node", "baipiao", "mcp", "--port", "0", "--dry-run"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Invalid port number.");

    output.length = 0;
    code = await runCli(["node", "baipiao", "mcp", "--port", "--dry-run"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Invalid port number.");
  });

  it("exposes MCP stdio dry-run and explicit HTTP unsupported behavior", async () => {
    const output: string[] = [];

    let code = await runCli(["node", "baipiao", "mcp", "--stdio", "--dry-run"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("MCP stdio transport");
    expect(output.join("\n")).toContain("baipiao mcp --stdio");

    output.length = 0;
    code = await runCli(["node", "baipiao", "mcp", "--port", "7331", "--dry-run"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("MCP HTTP transport ready.");
    expect(output.join("\n")).toContain("POST /mcp on http://127.0.0.1:7331/mcp");
    expect(output.join("\n")).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("lists vault metadata without revealing values", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Vault App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli([
      "node",
      "baipiao",
      "setup",
      "groq",
      "--input",
      "GROQ_API_KEY=gsk_abcdefghijklmnopqrstuvwxyz1234"
    ], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
      testFetch: () => Promise.resolve(new Response("{}", { status: 200 }))
    });
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "vault", "list"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao vault list");
    expect(text).toContain("GROQ_API_KEY");
    expect(text).toContain("groq");
    expect(text).toContain("stored");
    expect(text).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(text).not.toContain("gsk_");
  });

  it("manages vault entries and env generation without leaking by default", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Vault Commands"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const output: string[] = [];

    let code = await runCli([
      "node",
      "baipiao",
      "vault",
      "set",
      "GROQ_API_KEY",
      "--value",
      secret,
      "--service",
      "groq"
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Saved GROQ_API_KEY");
    expect(output.join("\n")).toContain("gsk_**************************1234");
    expect(output.join("\n")).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(await readFile(join(cwd, ".baipiao", "vault.local.json"), "utf8")).not.toContain(secret);

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "list"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("GROQ_API_KEY");
    expect(output.join("\n")).toContain("stored");
    expect(output.join("\n")).not.toContain(secret);

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "copy", "GROQ_API_KEY"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Clipboard is unavailable in this environment.");
    expect(output.join("\n")).toContain("baipiao vault reveal GROQ_API_KEY --confirm");
    expect(output.join("\n")).not.toContain(secret);

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "copy", "GROQ_API_KEY"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      writeClipboard: () => Promise.reject(new Error("clipboard command failed"))
    });
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Clipboard copy failed: clipboard command failed");
    expect(output.join("\n")).toContain("baipiao vault reveal GROQ_API_KEY --confirm");
    expect(output.join("\n")).not.toContain(secret);

    let copied = "";
    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "copy", "GROQ_API_KEY"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      writeClipboard: (text) => {
        copied = text;
        return Promise.resolve();
      }
    });
    expect(code).toBe(0);
    expect(copied).toBe(secret);
    expect(output.join("\n")).toContain("Copied GROQ_API_KEY");
    expect(output.join("\n")).not.toContain(secret);

    const clipboardEvents: string[] = [];
    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "copy", "GROQ_API_KEY", "--clear-after-ms", "0"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      writeClipboard: (text) => {
        clipboardEvents.push(text);
      }
    });
    expect(code).toBe(0);
    expect(clipboardEvents).toEqual([secret, ""]);
    expect(output.join("\n")).toContain("Clipboard cleared.");
    expect(output.join("\n")).not.toContain(secret);

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "reveal", "GROQ_API_KEY"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("requires --confirm");
    expect(output.join("\n")).not.toContain(secret);

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "reveal", "GROQ_API_KEY", "--confirm"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain(secret);

    output.length = 0;
    code = await runCli(["node", "baipiao", "env", "generate"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe(`GROQ_API_KEY=${secret}\n`);
    expect(output.join("\n")).toContain("Written .env.local");
    expect(output.join("\n")).not.toContain(secret);

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "health"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("GROQ_API_KEY");
    expect(output.join("\n")).not.toContain(secret);

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "remove", "GROQ_API_KEY"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Removed GROQ_API_KEY");
    expect(output.join("\n")).toContain("--sync-env");
  });

  it("removes vault entries from project state and syncs .env.local when requested", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Vault Remove Sync"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    await runCli([
      "node",
      "baipiao",
      "vault",
      "set",
      "GROQ_API_KEY",
      "--value",
      secret,
      "--service",
      "groq"
    ], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli(["node", "baipiao", "env", "generate"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "vault", "remove", "GROQ_API_KEY", "--sync-env"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const services = JSON.parse(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")) as {
      services: Array<{ serviceId: string; state: string; envKeys: string[]; configKeys: string[] }>;
    };
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Removed GROQ_API_KEY");
    expect(output.join("\n")).toContain("Synced .env.local");
    expect(output.join("\n")).not.toContain(secret);
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe("");
    expect(services.services).toContainEqual(expect.objectContaining({
      serviceId: "groq",
      state: "not_started",
      envKeys: [],
      configKeys: []
    }));
  });

  it("handles custom-service vault entries, list filters, and missing key errors cleanly", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-vault-custom-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Vault Custom"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    let code = await runCli([
      "node",
      "baipiao",
      "vault",
      "set",
      "CUSTOM_TOKEN",
      "--service",
      "manual",
      "--value",
      "custom-secret"
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Saved CUSTOM_TOKEN");
    expect(output.join("\n")).not.toContain("custom-secret");

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "list", "--service", "manual"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("CUSTOM_TOKEN  manual  stored");
    expect(output.join("\n")).not.toContain("GROQ_API_KEY");

    output.length = 0;
    code = await runCli(["node", "baipiao", "test", "manual"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Service: manual");
    expect(output.join("\n")).toContain("Status: skipped");
    expect(output.join("\n")).toContain("Connection test is not configured for custom services");

    output.length = 0;
    code = await runCli(["node", "baipiao", "test"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("manual  skipped");
    expect(output.join("\n")).not.toContain("SERVICE_NOT_FOUND");

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "copy", "MISSING_KEY"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      writeClipboard: () => undefined
    });
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("VAULT_ENTRY_NOT_FOUND: MISSING_KEY");
    expect(output.join("\n")).not.toContain("BaipiaoError");
    expect(output.join("\n")).not.toContain("node_modules");

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "reveal", "MISSING_KEY", "--confirm"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("VAULT_ENTRY_NOT_FOUND: MISSING_KEY");
    expect(output.join("\n")).not.toContain("BaipiaoError");

    output.length = 0;
    code = await runCli(["node", "baipiao", "vault", "remove", "MISSING_KEY"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    expect(code).toBe(1);
    expect(output.join("\n")).toContain("VAULT_ENTRY_NOT_FOUND: MISSING_KEY");
    expect(output.join("\n")).not.toContain("Removed MISSING_KEY");
  });

  it("sets vault entries from hidden input and validates service env patterns", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Hidden Vault"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const vault = new MemoryVaultService();
    const output: string[] = [];
    const prompts: string[] = [];
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";

    let code = await runCli([
      "node",
      "baipiao",
      "vault",
      "set",
      "GROQ_API_KEY",
      "--service",
      "groq"
    ], {
      cwd,
      vault,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      readSecret: (prompt) => {
        prompts.push(prompt);
        return Promise.resolve(secret);
      }
    });

    expect(code).toBe(0);
    expect(prompts).toEqual(["Enter value for GROQ_API_KEY: "]);
    expect(output.join("\n")).toContain("Saved GROQ_API_KEY");
    expect(output.join("\n")).toContain("gsk_**************************1234");
    expect(output.join("\n")).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    await expect(vault.get("GROQ_API_KEY")).resolves.toBe(secret);
    const services = JSON.parse(await readFile(join(cwd, ".baipiao", "services.json"), "utf8")) as {
      services: Array<{ serviceId: string; state: string }>;
    };
    expect(services.services).toContainEqual(expect.objectContaining({
      serviceId: "groq",
      state: "configured"
    }));

    output.length = 0;
    code = await runCli([
      "node",
      "baipiao",
      "vault",
      "set",
      "GROQ_API_KEY",
      "--value",
      "bad",
      "--service",
      "groq"
    ], {
      cwd,
      vault: new MemoryVaultService(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("SECRET_VALIDATION_FAILED");
    expect(output.join("\n")).not.toContain(secret);
  });

  it("imports vault entries from pasted output without printing values", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const output: string[] = [];
    const openrouterSecret = "sk-or-v1-abcdefghijklmnopqrstuvwxyz1234";

    const code = await runCli([
      "node",
      "baipiao",
      "vault",
      "import",
      "--service",
      "openrouter",
      "--input",
      `OPENROUTER_API_KEY=${openrouterSecret}`
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Imported 1 entries");
    expect(output.join("\n")).toContain("OPENROUTER_API_KEY");
    expect(output.join("\n")).not.toContain(openrouterSecret);
    expect(await readFile(join(cwd, ".baipiao", "vault.local.json"), "utf8")).not.toContain(openrouterSecret);
  });

  it("generates .env.example with key names only", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Env App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli(["node", "baipiao", "prompt", "groq"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "env", "generate", "--example"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const envExample = await readFile(join(cwd, ".env.example"), "utf8");
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Written .env.example");
    expect(envExample).toBe("GROQ_API_KEY=\n");
    expect(envExample).not.toContain("gsk_");
  });

  it("excludes configured_unverified env values unless explicitly included", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    await runCli(["node", "baipiao", "init", "--name", "Unverified Env App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli([
      "node",
      "baipiao",
      "output",
      "vercel",
      "--input",
      "API Key: vercel_token_123"
    ], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    let code = await runCli(["node", "baipiao", "env", "generate"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe("");
    expect(output.join("\n")).toContain("Skipped unverified env value: VERCEL_API_KEY");

    output.length = 0;
    code = await runCli(["node", "baipiao", "env", "generate", "--include-unverified"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    expect(code).toBe(0);
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe("VERCEL_API_KEY=vercel_token_123\n");
    expect(output.join("\n")).not.toContain("vercel_token_123");
  });

  it("runs connection test command and reports skipped without secrets", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "test", "vercel"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao test vercel");
    expect(text).toContain("skipped");
    expect(text).toContain("Connection test is not supported");
    expect(text).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("runs connection test command with saved Vault env values", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const output: string[] = [];
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    await runCli(["node", "baipiao", "init", "--name", "Test Groq App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli([
      "node",
      "baipiao",
      "vault",
      "set",
      "GROQ_API_KEY",
      "--value",
      secret,
      "--service",
      "groq"
    ], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    const code = await runCli(["node", "baipiao", "test", "groq"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      testFetch: (url, init) => {
        requests.push({ url: String(url), init });
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("Status: passed");
    expect(text).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(requests[0]?.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(JSON.stringify(requests[0]?.init?.headers)).toContain(`Bearer ${secret}`);
  });

  it("returns a failed test result when the connection request rejects", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const output: string[] = [];
    await runCli(["node", "baipiao", "init", "--name", "Test Reject App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli([
      "node",
      "baipiao",
      "vault",
      "set",
      "GROQ_API_KEY",
      "--value",
      secret,
      "--service",
      "groq"
    ], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });

    const code = await runCli(["node", "baipiao", "test", "groq"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      testFetch: () => Promise.reject(new Error("network rejected"))
    });

    const text = output.join("\n");
    expect(code).toBe(1);
    expect(text).toContain("Status: failed");
    expect(text).toContain("network rejected");
    expect(text).not.toContain(secret);
  });

  it("runs connection tests for tracked project services when service is omitted", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    await runCli(["node", "baipiao", "init", "--name", "Test All App"], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    await runCli([
      "node",
      "baipiao",
      "vault",
      "set",
      "GROQ_API_KEY",
      "--value",
      secret,
      "--service",
      "groq"
    ], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined
    });
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "test"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      testFetch: (url, init) => {
        requests.push({ url: String(url), init });
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao test");
    expect(text).toContain("groq");
    expect(text).toContain("passed");
    expect(text).not.toContain("gsk_");
    expect(requests[0]?.url).toBe("https://api.groq.com/openai/v1/chat/completions");
  });

  it("prints catalog source status", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "catalog", "sources"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao catalog sources");
    expect(text).toContain("free-for-dev");
    expect(text).toContain("https://github.com/ripienaar/free-for-dev");
    expect(text).toContain("https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md");
    expect(text).toContain("candidateCount");
    expect(text).toContain("lastStatus");
    expect(text).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("lists and filters full free-for-dev catalog candidates", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-candidates-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);
    const output: string[] = [];

    const code = await runCli([
      "node",
      "baipiao",
      "catalog",
      "candidates",
      "--query",
      "演示",
      "--category",
      "llm",
      "--locale",
      "zh-CN",
      "--limit",
      "10"
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao catalog candidates");
    expect(text).toContain("total: 1");
    expect(text).toContain("free-for-dev:generative-ai:demo-ai");
    expect(text).toContain("演示 AI");
    expect(text).toContain("zh-CN");
    expect(text).toContain("translated");
    expect(text).not.toContain("Static Host");
  });

  it("detects candidate query language when locale is omitted", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-auto-locale-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "catalog", "candidates", "--query", "演示"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("locale: zh-CN");
    expect(text).toContain("演示 AI");
  });

  it("detects supported candidate query languages and falls back to system locale", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-supported-locales-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);

    for (const [query, locale] of [
      ["デモ", "ja"],
      ["데모", "ko"],
      ["service gratuit", "fr"],
      ["servicio gratis", "es"]
    ]) {
      const output: string[] = [];
      const code = await runCli(["node", "baipiao", "catalog", "candidates", "--query", query, "--limit", "1"], {
        cwd,
        stdout: (text) => output.push(text),
        stderr: (text) => output.push(text)
      });

      expect(code).toBe(0);
      expect(output.join("\n")).toContain(`locale: ${locale}`);
    }

    const originalLcAll = process.env.LC_ALL;
    try {
      process.env.LC_ALL = "fr_FR.UTF-8";
      const output: string[] = [];
      const code = await runCli(["node", "baipiao", "catalog", "candidates", "--limit", "1"], {
        cwd,
        stdout: (text) => output.push(text),
        stderr: (text) => output.push(text)
      });

      expect(code).toBe(0);
      expect(output.join("\n")).toContain("locale: fr");
    } finally {
      if (originalLcAll === undefined) {
        delete process.env.LC_ALL;
      } else {
        process.env.LC_ALL = originalLcAll;
      }
    }
  });

  it("imports offline translations for free-for-dev catalog candidates", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-localize-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);
    await writeFile(join(cwd, "ja-translations.json"), `${JSON.stringify({
      translations: [
        {
          id: "free-for-dev:web-hosting:static-host",
          name: "静的ホスト",
          description: "無料の静的ホスティング。",
          freeTierText: "無料の静的サイトプラン。"
        }
      ]
    }, null, 2)}\n`, "utf8");
    const output: string[] = [];

    const code = await runCli([
      "node",
      "baipiao",
      "catalog",
      "localize",
      "--locale",
      "ja",
      "--input",
      "ja-translations.json"
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    const searchOutput: string[] = [];
    await runCli(["node", "baipiao", "catalog", "candidates", "--query", "ホスト"], {
      cwd,
      stdout: (text) => searchOutput.push(text),
      stderr: (text) => searchOutput.push(text)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("updated: 1");
    expect(searchOutput.join("\n")).toContain("locale: ja");
    expect(searchOutput.join("\n")).toContain("静的ホスト");
  });

  it("prints untranslated free-for-dev translation batches as JSON", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-translation-batch-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);
    const output: string[] = [];

    const code = await runCli([
      "node",
      "baipiao",
      "catalog",
      "translation-batch",
      "--locale",
      "zh-CN",
      "--limit",
      "10"
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });
    const payload = JSON.parse(output.join("\n")) as {
      locale: string;
      total: number;
      items: Array<{ id: string; source: { name: string } }>;
    };

    expect(code).toBe(0);
    expect(payload.locale).toBe("zh-CN");
    expect(payload.total).toBe(1);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]?.id).toBe("free-for-dev:web-hosting:static-host");
    expect(payload.items[0]?.source.name).toBe("Static Host");
  });

  it("prints free-for-dev catalog categories", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-categories-"));
    tmpPaths.push(cwd);
    await writeNormalizedCatalogFixture(cwd);
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "catalog", "categories"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao catalog categories");
    expect(text).toContain("llm  1");
    expect(text).toContain("hosting  1");
    expect(text).toContain("Generative AI  1");
    expect(text).toContain("Web Hosting  1");
  });

  it("refreshes free-for-dev catalog source with injected fetch", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const output: string[] = [];
    const fetchedUrls: string[] = [];

    const code = await runCli([
      "node",
      "baipiao",
      "catalog",
      "refresh",
      "--source",
      "free-for-dev"
    ], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text),
      fetchText: (url) => {
        fetchedUrls.push(url);
        return Promise.resolve({
          text: [
            "# free-for-dev",
            "",
            "## Generative AI",
            "",
            "* [Groq](https://groq.com/) - Fast inference API with a free tier."
          ].join("\n"),
          etag: "test-etag",
          commitSha: "test-commit"
        });
      }
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(fetchedUrls).toEqual(["https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md"]);
    expect(text).toContain("$ baipiao catalog refresh --source free-for-dev");
    expect(text).toContain("imported: 1");
    expect(text).toContain("needsReview: 1");
    expect(text).toContain("rawSnapshotPath: registry/sources/free-for-dev/raw/");
    expect(text).toContain("importSnapshotPath: registry/sources/free-for-dev/snapshots/");
    expect(await readFile(join(cwd, "registry/sources/free-for-dev/source.json"), "utf8")).toContain("test-etag");
    expect(await readFile(join(cwd, "registry/sources/free-for-dev/normalized.json"), "utf8")).toContain("\"groq\"");
    expect(text).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("lists catalog review candidates", async () => {
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "catalog", "review"], {
      cwd: process.cwd(),
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao catalog review");
    expect(text).toContain("needs_review");
    expect(text).toContain("free-for-dev");
    expect(text).toContain("SOURCE_CATEGORY");
    expect(text).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });

  it("lists no catalog review candidates when normalized catalog is missing", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "catalog", "review"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("$ baipiao catalog review");
    expect(text).toContain("No needs_review candidates.");
  });

  it("returns a plain error when updating catalog review status without a normalized catalog", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "catalog", "review", "free-for-dev:test:demo", "--accept"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(1);
    expect(text).toContain("ENOENT");
    expect(text).not.toContain("TypeError");
  });

  it("updates catalog review status in normalized catalog", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const catalogDir = join(cwd, "registry", "sources", "free-for-dev");
    const catalogPath = join(catalogDir, "normalized.json");
    await mkdir(catalogDir, { recursive: true });
    await writeFile(catalogPath, `${JSON.stringify({
      items: [
        {
          id: "free-for-dev:test:demo",
          name: "Demo",
          sourceCategory: "Testing",
          reviewStatus: "needs_review"
        }
      ]
    }, null, 2)}\n`, "utf8");
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "catalog", "review", "free-for-dev:test:demo", "--accept"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const updated = JSON.parse(await readFile(catalogPath, "utf8")) as {
      items: Array<{ id: string; reviewStatus: string }>;
    };
    expect(code).toBe(0);
    expect(output.join("\n")).toContain("accepted");
    expect(updated.items[0]).toMatchObject({
      id: "free-for-dev:test:demo",
      reviewStatus: "accepted"
    });
  });

  it("prints full catalog review candidate fields for manual review", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-cli-"));
    tmpPaths.push(cwd);
    const catalogDir = join(cwd, "registry", "sources", "free-for-dev");
    await mkdir(catalogDir, { recursive: true });
    await writeFile(join(catalogDir, "normalized.json"), `${JSON.stringify({
      items: [
        {
          id: "free-for-dev:generative-ai:demo-ai",
          name: "Demo AI",
          category: "llm",
          sourceCategory: "Generative AI",
          reviewStatus: "needs_review",
          source: { id: "free-for-dev" },
          confidence: "medium",
          url: "https://example.com",
          freeTierText: "Free tier available.",
          warnings: ["Needs pricing verification"]
        }
      ]
    }, null, 2)}\n`, "utf8");
    const output: string[] = [];

    const code = await runCli(["node", "baipiao", "catalog", "review"], {
      cwd,
      stdout: (text) => output.push(text),
      stderr: (text) => output.push(text)
    });

    const text = output.join("\n");
    expect(code).toBe(0);
    expect(text).toContain("STATUS  ID  NAME  CATEGORY  SOURCE_CATEGORY  SOURCE  CONFIDENCE  URL  FREE_TIER  WARNINGS");
    expect(text).toContain("free-for-dev:generative-ai:demo-ai");
    expect(text).toContain("llm");
    expect(text).toContain("free-for-dev");
    expect(text).toContain("medium");
    expect(text).toContain("https://example.com");
    expect(text).toContain("Free tier available.");
    expect(text).toContain("Needs pricing verification");
  });
});

async function writeNormalizedCatalogFixture(cwd: string): Promise<void> {
  const sourceDir = join(cwd, "registry", "sources", "free-for-dev");
  await mkdir(sourceDir, { recursive: true });
  await writeFile(join(sourceDir, "normalized.json"), `${JSON.stringify({
    schemaVersion: "baipiao.normalized-catalog.v1",
    generatedAt: "2026-05-13T00:00:00.000Z",
    source: {
      id: "free-for-dev",
      name: "free-for-dev",
      url: "https://github.com/ripienaar/free-for-dev",
      rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
      license: "unknown",
      fetchedAt: "2026-05-13T00:00:00.000Z",
      stale: false
    },
    parser: { name: "free-for-dev-markdown", version: "1" },
    stats: {
      categoryCount: 2,
      parsedItemCount: 2,
      skippedItemCount: 0,
      warningCount: 0
    },
    items: [
      normalizedCandidate({
        id: "free-for-dev:generative-ai:demo-ai",
        name: "Demo AI",
        slug: "demo-ai",
        category: "llm",
        sourceCategory: "Generative AI",
        description: "Free LLM gateway.",
        freeTierText: "Free model credits.",
        enrichment: {
          localization: {
            "zh-CN": {
              name: "演示 AI",
              description: "免费的 LLM 网关。",
              freeTierText: "免费模型额度。",
              status: "translated"
            }
          }
        }
      }),
      normalizedCandidate({
        id: "free-for-dev:web-hosting:static-host",
        name: "Static Host",
        slug: "static-host",
        category: "hosting",
        sourceCategory: "Web Hosting",
        description: "Free static hosting.",
        freeTierText: "Free static site plan."
      })
    ]
  }, null, 2)}\n`, "utf8");
}

function normalizedCandidate(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  category: string;
  sourceCategory: string;
  description: string;
  freeTierText: string;
  enrichment: unknown;
}>) {
  return {
    id: overrides.id,
    name: overrides.name,
    slug: overrides.slug,
    category: overrides.category,
    sourceCategory: overrides.sourceCategory,
    description: overrides.description,
    url: "https://example.com",
    capability: ["prompt"],
    freeTierText: overrides.freeTierText,
    freeTierStatus: "free_tier",
    source: {
      id: "free-for-dev",
      url: "https://github.com/ripienaar/free-for-dev",
      rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
      importedAt: "2026-05-13T00:00:00.000Z"
    },
    rawExcerptRef: {
      path: "registry/sources/free-for-dev/raw/sample.md",
      lineStart: 1,
      lineEnd: 1
    },
    confidence: "medium",
    reviewStatus: "needs_review",
    matchedServiceId: null,
    warnings: [],
    ...(overrides.enrichment ? { enrichment: overrides.enrichment } : {})
  };
}
