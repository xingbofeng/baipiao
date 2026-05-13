import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  createMcpToolHandlers,
  forbiddenMcpToolNames,
  handleJsonRpcRequest
} from "baipiao-mcp";
import { MemoryVaultService } from "baipiao-core";

import { runCli } from "../packages/cli/src/index.js";

let tmpPaths: string[] = [];

describe("PRD Definition of Done 1-17 final acceptance checklist", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("validates all 17 PRD DoD items end-to-end", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-prd-dod-"));
    tmpPaths.push(cwd);
    const outputs: string[] = [];
    const secrets = {
      setup: "gsk_abcdefghijklmnopqrstuvwxyz1234",
      output: "gsk_zxywvutsrqponmlkjihgfedcba1234",
      demoSecret: "DOD_DEMO_KEY_VALUE"
    };

    const run = async (label: string, args: string[], options?: { writeClipboard?: (text: string) => Promise<void> | void }) => {
      const text: string[] = [];
      const code = await runCli(["node", "baipiao", ...args], {
        cwd,
        stdout: (line) => text.push(line),
        stderr: (line) => text.push(line),
        testFetch: () => Promise.resolve(new Response("{}", { status: 200 })),
        ...options
      });
      const result = text.join("\n");
      outputs.push(`[${label}] ${result}`);
      return { code, result };
    };

    const allOutputsText = () => outputs.join("\n");
    const noSecretRegex =
      /gsk_[A-Za-z0-9_]{8,}|sk-or-v1-[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i;

    // 1. baipiao init 可初始化项目
    const init = await run("01-init", ["init", "--name", "PRD Demo App"]);
    expect(init.code).toBe(0);
    expect(init.result).toContain("Project initialized");
    expect(await readFile(join(cwd, ".baipiao", "project.json"), "utf8")).toContain("PRD Demo App");

    // 2. baipiao search 可搜索目录
    const search = await run("02-search", ["search", "openruter"]);
    expect(search.code).toBe(0);
    expect(search.result).toContain("OpenRouter");

    // 3. baipiao info 可查看服务
    const info = await run("03-info", ["info", "groq"]);
    expect(info.code).toBe(0);
    expect(info.result).toContain("GROQ_API_KEY");
    expect(info.result).toContain("openai_compatible_chat");

    // 4. baipiao prompt 可生成提示词
    const prompt = await run("04-prompt", ["prompt", "groq"]);
    expect(prompt.code).toBe(0);
    expect(prompt.result).toContain("GROQ_API_KEY=...");
    expect(prompt.result).toContain("Do not save website login passwords.");
    expect(prompt.result).toContain("If login, CAPTCHA, email verification, or 2FA is required, pause and ask the user to complete it manually.");

    // 5. baipiao setup 可完成主流程
    const setup = await run("05-setup", [
      "setup",
      "groq",
      "--input",
      `GROQ_API_KEY=${secrets.setup}`
    ]);
    expect(setup.code).toBe(0);
    expect(setup.result).toContain("State: tested");
    expect(setup.result).toContain("added to .env.local");
    expect(setup.result).toContain("GROQ_API_KEY=gsk_**************************1234");
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe(`GROQ_API_KEY=${secrets.setup}\n`);
    expect(await readFile(join(cwd, ".baipiao", "outputs", "groq.md"), "utf8")).toContain("GROQ_API_KEY=gsk_**************************1234");

    // 6. baipiao output 可导入 Agent 输出
    const output = await run("06-output", [
      "output",
      "groq",
      "--input",
      `GROQ_API_KEY=${secrets.output}`
    ]);
    expect(output.code).toBe(0);
    expect(output.result).toContain("State: tested");
    expect(await readFile(join(cwd, ".env.local"), "utf8")).toBe(`GROQ_API_KEY=${secrets.output}\n`);

    // 7. baipiao vault 是一级功能
    const vaultRoot = await run("07-vault-feature", ["vault"]);
    expect(vaultRoot.code).toBe(0);
    expect(vaultRoot.result).toContain("$ baipiao vault list");

    // 8. baipiao vault list 不泄露明文
    const vaultList = await run("08-vault-list", ["vault", "list"]);
    expect(vaultList.code).toBe(0);
    expect(vaultList.result).toContain("GROQ_API_KEY");
    expect(vaultList.result).toContain("stored");
    expect(vaultList.result).not.toContain(secrets.setup);

    // 9. baipiao vault set/import/copy/remove/health 可用
    const vaultSet = await run("09-vault-set", [
      "vault",
      "set",
      "DOD_DEMO_KEY",
      "--value",
      secrets.demoSecret,
      "--service",
      "groq"
    ]);
    expect(vaultSet.code).toBe(0);
    expect(vaultSet.result).toContain("Saved DOD_DEMO_KEY");

    const vaultImport = await run("09-vault-import", [
      "vault",
      "import",
      "--input",
      "DOD_IMPORT_KEY=fixture-import-value",
      "--service",
      "groq"
    ]);
    expect(vaultImport.code).toBe(0);
    expect(vaultImport.result).toContain("Imported 1 entries");

    const copied: string[] = [];
    const vaultCopy = await run("09-vault-copy", ["vault", "copy", "DOD_IMPORT_KEY"], {
      writeClipboard: (text) => {
        copied.push(text);
      }
    });
    expect(vaultCopy.code).toBe(0);
    expect(copied).toContain("fixture-import-value");

    const vaultHealth = await run("09-vault-health", ["vault", "health"]);
    expect(vaultHealth.code).toBe(0);
    expect(vaultHealth.result).toContain("KEY  SERVICE  STATUS  SCOPE  TEST");

    const vaultRemove = await run("09-vault-remove", ["vault", "remove", "DOD_DEMO_KEY", "--sync-env"]);
    expect(vaultRemove.code).toBe(0);
    expect(vaultRemove.result).toContain("Removed DOD_DEMO_KEY");
    expect(vaultRemove.result).toContain("Synced .env.local");

    // 10. baipiao env generate 可生成 env
    const envGenerateExample = await run("10-env-generate-example", ["env", "generate", "--example"]);
    expect(envGenerateExample.code).toBe(0);
    expect(envGenerateExample.result).toContain("Written .env.example");
    expect(await readFile(join(cwd, ".env.example"), "utf8")).toContain("GROQ_API_KEY=");

    const envGenerate = await run("10-env-generate", ["env", "generate"]);
    expect(envGenerate.code).toBe(0);
    expect(envGenerate.result).toContain("Written .env.local");

    // 11. baipiao test 可测试支持的服务
    const testSupported = await run("11-test", ["test", "vercel"]);
    expect(testSupported.code).toBe(0);
    expect(testSupported.result).toContain("baipiao test vercel");
    expect(testSupported.result).toContain("Status:");

    // 12. baipiao status 可查看状态
    const status = await run("12-status", ["status"]);
    expect(status.code).toBe(0);
    expect(status.result).toContain("Project");
    expect(status.result).toContain("AI Services");
    expect(status.result).toContain("Backend Services");
    expect(status.result).toContain("Vault");

    // 13. baipiao mcp 可启动
    const mcpDryRun = await run("13-mcp-stdio", ["mcp", "--stdio", "--dry-run"]);
    expect(mcpDryRun.code).toBe(0);
    expect(mcpDryRun.result).toContain("MCP stdio transport ready.");

    // 14. MCP tools 可被 Agent 调用
    const handlers = createMcpToolHandlers({ vault: new MemoryVaultService() });
    const tools = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "list_services", arguments: { query: "llm" } }
    }, handlers);
    const promptTool = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "generate_setup_prompt", arguments: { serviceId: "groq", projectSlug: "prd-dod-app" } }
    }, handlers);
    const statusTool = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "get_status", arguments: {} }
    }, handlers);
    const vaultListTool = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "vault_list", arguments: {} }
    }, handlers);

    const toolsResult = asToolCallResult(tools, "list_services");
    const promptToolResult = asToolCallResult(promptTool, "generate_setup_prompt");
    const statusToolResult = asToolCallResult(statusTool, "get_status");
    const vaultListToolResult = asToolCallResult(vaultListTool, "vault_list");

    expect(toolsResult.tool).toBe("list_services");
    expect(promptToolResult.tool).toBe("generate_setup_prompt");
    expect(statusToolResult.tool).toBe("get_status");
    expect(vaultListToolResult.tool).toBe("vault_list");

    const toolsListEnvelope = await handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/list",
      params: {}
    }, handlers);
    if (!("result" in toolsListEnvelope) || !toolsListEnvelope.result) {
      throw new Error("tools/list should return result.");
    }
    const toolListResult = toolsListEnvelope.result;
    if (!isToolListResult(toolListResult)) {
      throw new Error("tools/list result shape is invalid.");
    }
    const toolNames = toolListResult.tools
      .filter((tool): tool is { name: string } =>
        isPlainRecord(tool) && typeof tool.name === "string"
      )
      .map((tool) => tool.name);
    expect(toolNames).not.toContain("vault_reveal");
    expect(toolNames).not.toContain("get_secret_value");
    expect(toolNames).not.toContain("browser_click");
    expect(toolNames).not.toContain("browser_type");
    expect(forbiddenMcpToolNames).toContain("browser_click");
    expect(forbiddenMcpToolNames).toContain("browser_type");

    // 15. 所有日志脱敏
    expect(allOutputsText()).not.toMatch(noSecretRegex);
    expect(allOutputsText()).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(allOutputsText()).not.toContain("zxywvutsrqponmlkjihgfedcba1234");
    expect(await readFile(join(cwd, ".baipiao", "outputs", "groq.md"), "utf8")).not.toContain(secrets.setup);

    // 16. 不保存网页登录密码
    expect(prompt.result).toContain("Do not save website login passwords.");
    expect(prompt.result).toContain("If login, CAPTCHA, email verification, or 2FA is required, pause and ask the user to complete it manually.");

    // 17. 不包含浏览器自动化
    const source = await collectSourceText([
      join(process.cwd(), "packages/core/src"),
      join(process.cwd(), "packages/cli/src"),
      join(process.cwd(), "packages/mcp-server/src")
    ], [".ts"]);
    expect(source).not.toMatch(/\b(playwright|puppeteer|selenium)\b/i);
    expect(source).not.toMatch(/\bbrowser automation\b/i);
  });
});

async function collectSourceText(sourceRoots: string[], allowedExtensions: string[]): Promise<string> {
  const fileTexts: string[] = [];
  const allowed = new Set(allowedExtensions.map((ext) => ext.toLowerCase()));

  for (const root of sourceRoots) {
    fileTexts.push(...await collectTextFromPath(root, allowed));
  }
  return fileTexts.join("\n");
}

function asToolCallResult(
  response: unknown,
  expectedTool: string
): { tool: string; output: unknown } {
  if (!isPlainRecord(response) || !("result" in response)) {
    throw new Error("MCP tool call should return a result field.");
  }
  if (!isPlainRecord(response.result) || typeof response.result.tool !== "string") {
    throw new Error("MCP tool call result shape is invalid.");
  }
  if (response.result.tool !== expectedTool) {
    throw new Error(`MCP tool call expected ${expectedTool}, got ${String(response.result.tool)}.`);
  }

  return { tool: response.result.tool, output: response.result.output };
}

function isPlainRecord(value: unknown): value is { [key: string]: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolListResult(value: unknown): value is { tools: unknown[] } {
  return isPlainRecord(value) && Array.isArray((value as { tools?: unknown[] }).tools);
}

async function collectTextFromPath(path: string, allowedExtensions: Set<string>): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
  const childOutputs = await Promise.all(entries.map(async (entry) => {
    const childPath = join(path, entry.name);
    if (entry.isDirectory()) {
      return collectTextFromPath(childPath, allowedExtensions);
    }
    if (!allowedExtensions.has(extname(childPath).toLowerCase())) {
      return [];
    }
    return [await readFile(childPath, "utf8")];
  }));

  return childOutputs.flat();
}
