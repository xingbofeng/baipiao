import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";

import type { McpClientConfig, SupportedMcpClient } from "baipiao-mcp";

const execFileAsync = promisify(nodeExecFile);
const SERVER_NAME = "baipiao";

export type ExecFile = (
  file: string,
  args: string[]
) => Promise<{ stdout?: string; stderr?: string }>;

export type InstallMcpClientOptions = {
  client: SupportedMcpClient;
  config: McpClientConfig;
  homeDir?: string;
  execFile?: ExecFile;
};

export type InstallMcpClientResult = {
  client: SupportedMcpClient;
  target: string;
  detail: string;
};

export async function installMcpClient(options: InstallMcpClientOptions): Promise<InstallMcpClientResult> {
  switch (options.client) {
    case "claude":
      return installClaudeMcp(options);
    case "codex":
      return installCodexMcp(options);
    case "cursor":
      return installCursorMcp(options);
  }
}

async function installClaudeMcp(options: InstallMcpClientOptions): Promise<InstallMcpClientResult> {
  const run = options.execFile ?? defaultExecFile;
  await run("claude", ["mcp", "remove", "--scope", "user", SERVER_NAME]).catch(() => undefined);

  if (options.config.transport === "http") {
    if (!options.config.url) {
      throw new Error("Claude HTTP MCP install requires a URL.");
    }
    await run("claude", ["mcp", "add", "--scope", "user", "--transport", "http", SERVER_NAME, options.config.url]);
  } else {
    await run("claude", [
      "mcp",
      "add",
      "--scope",
      "user",
      SERVER_NAME,
      "--",
      options.config.command ?? "baipiao",
      ...(options.config.args ?? ["mcp"])
    ]);
  }

  return {
    client: "claude",
    target: "~/.claude.json",
    detail: "Claude Code user MCP config updated."
  };
}

async function installCodexMcp(options: InstallMcpClientOptions): Promise<InstallMcpClientResult> {
  const run = options.execFile ?? defaultExecFile;
  await run("codex", ["mcp", "remove", SERVER_NAME]).catch(() => undefined);

  if (options.config.transport === "http") {
    if (!options.config.url) {
      throw new Error("Codex HTTP MCP install requires a URL.");
    }
    await run("codex", ["mcp", "add", SERVER_NAME, "--url", options.config.url]);
  } else {
    await run("codex", [
      "mcp",
      "add",
      SERVER_NAME,
      "--",
      options.config.command ?? "baipiao",
      ...(options.config.args ?? ["mcp"])
    ]);
  }

  return {
    client: "codex",
    target: "~/.codex/config.toml",
    detail: "Codex user MCP config updated."
  };
}

async function installCursorMcp(options: InstallMcpClientOptions): Promise<InstallMcpClientResult> {
  const home = options.homeDir ?? homedir();
  const target = join(home, ".cursor", "mcp.json");
  const existing = await readJsonFile(target);
  const currentServers = isRecord(existing.mcpServers) ? existing.mcpServers : {};
  const nextServer = options.config.transport === "http"
    ? { url: options.config.url }
    : { command: options.config.command ?? "baipiao", args: options.config.args ?? ["mcp"] };

  const nextConfig = {
    ...existing,
    mcpServers: {
      ...currentServers,
      [SERVER_NAME]: nextServer
    }
  };

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");

  return {
    client: "cursor",
    target,
    detail: "Cursor global MCP config updated."
  };
}

async function readJsonFile(path: string): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(path, "utf8");
    const parsed = JSON.parse(content) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function defaultExecFile(file: string, args: string[]): Promise<{ stdout?: string; stderr?: string }> {
  return execFileAsync(file, args);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
