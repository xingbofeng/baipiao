#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

import clipboard from "clipboardy";
import {
  classifyVaultKey,
  FileVaultService,
  findFreeForDevNormalizedCandidate,
  generateCatalogCandidatePrompt,
  generateEnvFiles,
  generateSetupPrompt,
  type CatalogNormalizedItem,
  type ConnectionTestFetch,
  getServiceByIdOrSlug,
  initializeProject,
  loadServiceConfigs,
  MemoryVaultService,
  maskSecretValue,
  parseAgentOutput,
  processAgentOutputForService,
  recommendStack,
  refreshFreeForDevSource,
  runConnectionTest,
  searchFreeForDevCatalog,
  updateProjectServiceState,
  type FetchTextResult,
  type ServiceRecord,
  type ServiceState,
  type VaultEntryMetadata,
  type VaultService
} from "baipiao-core";
import {
  generateMcpClientConfig,
  startHttpMcpServer,
  startStdioMcpServer,
  supportedMcpClients,
  type SupportedMcpClient
} from "baipiao-mcp";

import { runCatalogCommand } from "./commands/catalog.js";
import { installMcpClient, type ExecFile } from "./commands/mcpInstall.js";
import { renderInitView } from "./renderers/init.js";
import { renderSearchView } from "./renderers/search.js";
import { renderSetupView } from "./renderers/setup.js";
import { renderStatusView, type StatusServiceRow } from "./renderers/status.js";
import { detectTerminalCapabilities, type TerminalCapabilityInput } from "./terminal/capabilities.js";

const require = createRequire(import.meta.url);

export * from "./renderers/init.js";
export * from "./renderers/search.js";
export * from "./renderers/setup.js";
export * from "./renderers/status.js";

export type CliIO = {
  cwd: string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  fetchText?: (url: string) => Promise<FetchTextResult>;
  vault?: VaultService;
  writeClipboard?: (text: string) => Promise<void> | void;
  readSecret?: (prompt: string) => Promise<string>;
  readAgentOutput?: (prompt: string) => Promise<string>;
  confirm?: (prompt: string) => Promise<boolean>;
  terminal?: TerminalCapabilityInput;
  testFetch?: ConnectionTestFetch;
  homeDir?: string;
  execFile?: ExecFile;
};

export function createDefaultCliIO(): CliIO {
  return {
    cwd: process.cwd(),
    stdout: (text) => {
      process.stdout.write(`${text}\n`);
    },
    stderr: (text) => {
      process.stderr.write(`${text}\n`);
    },
    writeClipboard: (text) => clipboard.write(text)
  };
}

export async function runCli(argv: string[], io: CliIO): Promise<number> {
  const args = argv.slice(2);
  const command = args[0];

  if (command === "--version" || command === "-v") {
    io.stdout(readPackageVersion());
    return 0;
  }

  if (!command || command === "--help" || command === "-h") {
    io.stdout(renderHelp());
    return 0;
  }

  if (command === "init") {
    const name = readFlagValue(args, "--name");
    const result = await initializeProject({ cwd: io.cwd, ...(name ? { name } : {}) });
    const terminal = detectTerminalCapabilities(io.terminal);
    io.stdout(renderInitView({
      projectName: name ?? "baipiao",
      createdFiles: result.createdFiles,
      nextCommand: "baipiao search <keyword>"
    }, terminal));
    return 0;
  }

  if (command === "search") {
    const query = args[1] ?? "";
    const systemLocale = getSystemLocale();
    const result = await searchFreeForDevCatalog(io.cwd, {
      query,
      ...(systemLocale === undefined ? {} : { systemLocale }),
      limit: 20
    });
    const terminal = detectTerminalCapabilities(io.terminal);
    io.stdout(renderSearchView({
      query,
      categoryLabel: query.toLowerCase() === "llm" ? "LLM" : query,
      detectedLanguage: result.requestedLocale,
      results: result.items.map((item) => ({
        name: item.name,
        freeTierStatus: item.freeTierStatus
      })),
      quickFilters: ["database", "storage", "hosting"]
    }, terminal));
    return 0;
  }

  if (command === "info") {
    const serviceId = args[1];
    if (!serviceId) {
      io.stderr("Missing service id.");
      return 1;
    }
    const services = await loadServiceConfigs();
    const service = getServiceByIdOrSlug(services, serviceId);
    if (!service) {
      const candidate = await findFreeForDevNormalizedCandidate(io.cwd, serviceId);
      if (!candidate) {
        io.stderr(`SERVICE_NOT_FOUND: ${serviceId}`);
        return 1;
      }
      io.stdout([
        `${candidate.name}`,
        `Category: ${candidate.category}`,
        `Source category: ${candidate.sourceCategory}`,
        `Homepage: ${candidate.url}`,
        `Free tier: ${candidate.freeTierText}`,
        `Source: ${candidate.source.id}`,
        `Review: ${candidate.reviewStatus}`,
        `Warnings: ${candidate.warnings.join("; ") || "none"}`
      ].join("\n"));
      return 0;
    }
    io.stdout([
      `${service.name}`,
      `Category: ${service.category}`,
      `Homepage: ${service.config?.urls?.homepage ?? service.url ?? "unknown"}`,
      `Console: ${service.config?.urls?.console ?? "unknown"}`,
      `API Keys: ${service.config?.urls?.apiKeys ?? "unknown"}`,
      `Docs: ${service.config?.urls?.docs ?? "unknown"}`,
      `Free tier: ${service.config?.freeTier?.summary ?? "unknown"}`,
      `Capabilities: ${service.capability.join(", ")}`,
      `Env: ${(service.config?.env ?? []).map((env) => env.key).join(", ") || "none"}`,
      `Test: ${service.config?.test?.type ?? "manual"}`,
      `Risks: ${(service.config?.risks ?? []).join("; ") || "none"}`
    ].join("\n"));
    return 0;
  }

  if (command === "prompt") {
    const serviceId = args[1];
    if (!serviceId) {
      io.stderr("Missing service id.");
      return 1;
    }
    const match = await resolveSetupTarget(io.cwd, serviceId);
    if (!match) {
      io.stderr(`SERVICE_NOT_FOUND: ${serviceId}`);
      return 1;
    }

    if (match.kind === "candidate") {
      await tryUpdateState(io.cwd, {
        serviceId: match.service.id,
        state: "prompt_generated",
        envKeys: [],
        configKeys: [],
        lastPromptGeneratedAt: new Date().toISOString()
      });
      return outputPrompt(generateCatalogCandidatePrompt(match.candidate, { projectSlug: "project" }), args, io);
    }

    const service = match.service;
    await tryUpdateState(io.cwd, {
      serviceId: service.id,
      state: "prompt_generated",
      envKeys: service.config?.env?.map((env) => env.key) ?? [],
      configKeys: [],
      lastPromptGeneratedAt: new Date().toISOString()
    });
    return outputPrompt(generateSetupPrompt(service, { projectSlug: "project" }), args, io);
  }

  if (command === "setup" || command === "output") {
    const serviceId = args[1];
    let input = readFlagValue(args, "--input");
    if (!serviceId) {
      io.stderr("Missing service id.");
      return 1;
    }

    const match = await resolveSetupTarget(io.cwd, serviceId);
    if (!match) {
      io.stderr(`SERVICE_NOT_FOUND: ${serviceId}`);
      return 1;
    }

    const service = match.service;

    const setupMessages: string[] = [];
    if (command === "setup") {
      const prompt = match.kind === "candidate"
        ? generateCatalogCandidatePrompt(match.candidate, { projectSlug: "project" })
        : generateSetupPrompt(service, { projectSlug: "project" });
      await tryUpdateState(io.cwd, {
        serviceId: service.id,
        state: "prompt_generated",
        envKeys: service.config?.env?.map((env) => env.key) ?? [],
        configKeys: [],
        lastPromptGeneratedAt: new Date().toISOString()
      });
      if (!input) {
        if (io.writeClipboard) {
          await io.writeClipboard(prompt);
          setupMessages.push("Prompt copied to clipboard.");
        } else {
          setupMessages.push(prompt);
          setupMessages.push("Prompt ready. Copy it into your Agent, then paste the Agent output back here.");
        }
        input = await io.readAgentOutput?.(`Paste Agent output for ${service.id}: `);
      }
    }

    if (!input) {
      if (command === "setup" && setupMessages.length > 0) {
        io.stdout([
          ...setupMessages,
          `Waiting for Agent output. Rerun with: baipiao setup ${service.id} --input <KEY=VALUE>`
        ].join("\n"));
        return 0;
      }
      io.stderr("Missing Agent output. Use --input for non-interactive mode.");
      return 1;
    }

    const vault = await getWorkflowVault(io);
    const retryMessages: string[] = [];
    let result = await processAgentOutputForService({
      service,
      text: input,
      vault,
      testConnection: (targetService, env) => runCliWorkflowConnectionTest(io, targetService, env)
    });
    for (let retryCount = 0; result.failed.length > 0 && command === "setup" && io.readAgentOutput && retryCount < 1; retryCount += 1) {
      retryMessages.push(`Retry: ${result.failed[0]?.code ?? "AGENT_OUTPUT_PARSE_FAILED"}`);
      input = await io.readAgentOutput(`Paste Agent output for ${service.id} again: `);
      result = await processAgentOutputForService({
        service,
        text: input,
        vault,
        testConnection: (targetService, env) => runCliWorkflowConnectionTest(io, targetService, env)
      });
    }
    await tryArchiveAgentOutput(io.cwd, service.id, result.archiveMarkdown);

    if (result.failed.length > 0) {
      await tryUpdateState(io.cwd, {
        serviceId: service.id,
        state: "failed",
        envKeys: [],
        configKeys: [],
        lastError: result.failed.map((entry) => `${entry.key}:${entry.code}`).join(", ")
      });
      io.stdout([
        ...setupMessages,
        ...retryMessages,
        `State: ${result.state}`,
        ...result.failed.map((entry) => `${entry.key}: ${entry.code} - ${entry.reason}`)
      ].join("\n"));
      return 1;
    }

    if (result.state === "failed") {
      const now = new Date().toISOString();
      await tryUpdateState(io.cwd, {
        serviceId: service.id,
        state: "failed",
        envKeys: result.saved.map((entry) => entry.key),
        configKeys: result.saved.map((entry) => entry.key),
        lastAgentOutputAt: now,
        lastSecretSavedAt: now,
        lastTestAt: now,
        lastError: result.testResult.message
      });
      io.stdout([
        ...setupMessages,
        ...retryMessages,
        renderSetupView({
          command: `baipiao ${command} ${serviceId}`,
          serviceName: service.name,
          state: result.state,
          savedEntries: result.saved.map((entry) => ({
            key: entry.key,
            maskedValue: entry.maskedValue,
            status: "stored"
          })),
          testStatus: result.testResult.status,
          envLocalUpdated: false,
          ...(result.warnings.length > 0 ? { envWarnings: result.warnings } : {})
        }),
        result.testResult.message
      ].filter(Boolean).join("\n"));
      return 1;
    }

    await tryUpdateState(io.cwd, {
      serviceId: service.id,
      state: result.state,
      envKeys: result.saved.map((entry) => entry.key),
      configKeys: result.saved.map((entry) => entry.key),
      lastAgentOutputAt: new Date().toISOString(),
      lastSecretSavedAt: new Date().toISOString(),
      ...(result.state === "tested" ? { lastTestAt: new Date().toISOString() } : {})
    });
    const envSync = await syncEnvLocalFile(io);
    const setupWarnings = new Set([...result.warnings, ...envSync.warnings]);

    io.stdout([
      ...setupMessages,
      ...retryMessages,
      renderSetupView({
        command: `baipiao ${command} ${serviceId}`,
        serviceName: service.name,
        state: result.state,
        savedEntries: result.saved.map((entry) => ({
          key: entry.key,
          maskedValue: entry.maskedValue,
          status: "stored"
        })),
        testStatus: result.testResult.status,
        envLocalUpdated: envSync.updated,
        ...(setupWarnings.size > 0 ? { envWarnings: [...setupWarnings] } : {})
      })
    ].filter(Boolean).join("\n"));
    return 0;
  }

  if (command === "status") {
    const services = await loadServiceConfigs();
    const records = await loadProjectServiceRecords(io.cwd);
    const rows = records.map((record) => toStatusRow(record, services));
    const knownRows = rows.filter((row): row is StatusServiceRow & { category: string } => row !== undefined);
    const vaultKeyCount = (await getPersistentVault(io).list()).filter((entry) => entry.status === "stored").length;
    const firstServiceId = records[0]?.serviceId ?? "<service>";

    io.stdout(renderStatusView({
      projectName: await loadProjectNameSafe(io.cwd),
      aiServices: knownRows.filter((row) => row.category === "llm"),
      backendServices: knownRows.filter((row) => row.category !== "llm"),
      vaultKeyCount,
      quickActions: [
        `baipiao test ${firstServiceId}`,
        "baipiao vault list",
        "baipiao env generate"
      ]
    }));
    return 0;
  }

  if (command === "stack" && args[1] === "recommend") {
    const stackType = args[2];
    if (!isStackRecommendationInput(stackType)) {
      io.stderr("Missing or invalid stack type.");
      return 1;
    }
    const stack = recommendStack(stackType);
    io.stdout([
      `$ baipiao stack recommend ${stackType}`,
      "",
      stack.title,
      ...stack.services.map((service) => {
        const required = service.required ? "required" : "optional";
        return `  - ${service.serviceId}  ${service.role}  ${required}`;
      }),
      "",
      "Next:",
      "  $ baipiao setup-stack ai-basic"
    ].join("\n"));
    return 0;
  }

  if (command === "setup-stack") {
    const stackType = args[1];
    if (!isStackRecommendationInput(stackType)) {
      io.stderr("Missing or invalid stack type.");
      return 1;
    }

    const stack = recommendStack(stackType);
    const services = await loadServiceConfigs();
    const sections: string[] = [];
    for (const stackService of stack.services) {
      const service = getServiceByIdOrSlug(services, stackService.serviceId);
      if (!service) {
        io.stderr(`SERVICE_NOT_FOUND: ${stackService.serviceId}`);
        return 1;
      }

      await tryUpdateState(io.cwd, {
        serviceId: service.id,
        state: "prompt_generated",
        envKeys: service.config?.env?.map((env) => env.key) ?? [],
        configKeys: [],
        lastPromptGeneratedAt: new Date().toISOString()
      });
      sections.push([
        `## ${service.id}`,
        `Role: ${stackService.role}`,
        `Required: ${stackService.required ? "yes" : "no"}`,
        "",
        generateSetupPrompt(service, { projectSlug: "project" })
      ].join("\n"));
    }

    io.stdout([
      `$ baipiao setup-stack ${stackType}`,
      "",
      stack.title,
      "",
      ...sections
    ].join("\n\n"));
    return 0;
  }

  if (command === "mcp" && args[1] === "install") {
    const client = args[2];
    if (!isSupportedMcpClient(client)) {
      io.stderr("Missing or invalid MCP client. Use cursor, claude, or codex.");
      return 1;
    }

    const port = readPort(args);
    if (port === null) {
      io.stderr("Invalid port number.");
      return 1;
    }
    const config = generateMcpClientConfig({
      client,
      ...(port === undefined ? {} : { transport: "http", port })
    });
    try {
      const result = await installMcpClient({
        client,
        config,
        ...(io.homeDir ? { homeDir: io.homeDir } : {}),
        ...(io.execFile ? { execFile: io.execFile } : {})
      });
      io.stdout([
        `Installed baipiao MCP for ${result.client}.`,
        `Target: ${result.target}`,
        result.detail
      ].join("\n"));
    } catch (error) {
      io.stderr(error instanceof Error ? error.message : "MCP install failed.");
      return 1;
    }
    return 0;
  }

  if (command === "mcp") {
    if (args.includes("--dry-run")) {
      const port = readPort(args);
      if (port === null) {
        io.stderr("Invalid port number.");
        return 1;
      }
      if (args.includes("--port")) {
        const effectivePort = port ?? 7331;
        io.stdout([
          "MCP HTTP transport ready.",
          `POST /mcp on http://127.0.0.1:${effectivePort}/mcp`,
          "stdout is reserved for JSON-RPC protocol frames."
        ].join("\n"));
      } else {
        io.stdout([
          "MCP stdio transport ready.",
          "Command: baipiao mcp --stdio",
          "stdout is reserved for JSON-RPC protocol frames."
        ].join("\n"));
      }
      return 0;
    }

    if (args.includes("--port")) {
      const port = readPort(args);
      if (port === null || port === undefined) {
        io.stderr("Invalid port number.");
        return 1;
      }

      const httpServerOptions: Parameters<typeof startHttpMcpServer>[0] = {
        cwd: io.cwd,
        port
      };
      if (io.vault) {
        httpServerOptions.vault = io.vault;
      }
      await startHttpMcpServer(httpServerOptions);
      io.stdout(`MCP HTTP transport ready. POST /mcp on http://127.0.0.1:${port}/mcp`);
      return 0;
    }

    if (args.includes("--stdio") || args.length === 1) {
      const stdioServerOptions: Parameters<typeof startStdioMcpServer>[0] = {
        cwd: io.cwd
      };
      if (io.vault) {
        stdioServerOptions.vault = io.vault;
      }
      await startStdioMcpServer(stdioServerOptions);
      return 0;
    }

    io.stderr("Use --stdio for stdio transport or --port for HTTP transport.");
    return 1;
  }

  if (command === "vault" && args[1] === "set") {
    const key = args[2];
    const value = readFlagValue(args, "--value") ?? await readHiddenVaultValue(io, key);
    const serviceId = readFlagValue(args, "--service");
    if (!key) {
      io.stderr("Missing vault key.");
      return 1;
    }
    if (!value) {
      io.stderr("Missing value. Use --value for non-interactive mode or provide hidden input.");
      return 1;
    }
    const validationError = await validateVaultSetValue({
      key,
      value,
      ...(serviceId ? { serviceId } : {})
    });
    if (validationError) {
      io.stderr(validationError);
      return 1;
    }

    const vault = getPersistentVault(io);
    const entry = await vault.set(key, value, { ...(serviceId ? { serviceId } : {}) });
    if (serviceId) {
      await tryUpdateState(io.cwd, {
        serviceId,
        state: "configured",
        envKeys: [key],
        configKeys: [key],
        lastSecretSavedAt: new Date().toISOString()
      });
    }
    io.stdout([
      `Saved ${entry.key}`,
      `status: ${entry.status}`,
      `scope: ${entry.scope}`,
      `value: ${entry.secret ? maskSecretValue(value) : "[stored]"}`
    ].join("\n"));
    return 0;
  }

  if (command === "vault" && args[1] === "import") {
    const input = readFlagValue(args, "--input");
    const serviceId = readFlagValue(args, "--service");
    if (!input) {
      io.stderr("Missing input. Use --input for non-interactive mode.");
      return 1;
    }

    const parsed = parseAgentOutput(input);
    if (parsed.entries.length === 0) {
      io.stderr("No vault entries found in input.");
      return 1;
    }

    const vault = getPersistentVault(io);
    const saved: VaultEntryMetadata[] = [];
    for (const entry of parsed.entries) {
      saved.push(await vault.set(entry.key, entry.value, { ...(serviceId ? { serviceId } : {}) }));
    }
    if (serviceId) {
      await tryUpdateState(io.cwd, {
        serviceId,
        state: "configured",
        envKeys: saved.map((entry) => entry.key),
        configKeys: saved.map((entry) => entry.key),
        lastSecretSavedAt: new Date().toISOString()
      });
    }
    io.stdout([
      `Imported ${saved.length} entries`,
      ...saved.map((entry) => `  ${entry.key}  ${entry.status}  ${entry.scope}`),
      ...parsed.warnings.map((warning) => `warning: ${warning}`)
    ].join("\n"));
    return 0;
  }

  if (command === "vault" && args[1] === "copy") {
    const key = args[2];
    if (!key) {
      io.stderr("Missing vault key.");
      return 1;
    }
    if (!io.writeClipboard) {
      io.stderr(renderClipboardFallbackMessage(key));
      return 1;
    }

    const vault = getPersistentVault(io);
    if (!(await vault.has(key))) {
      io.stderr(`VAULT_ENTRY_NOT_FOUND: ${key}`);
      return 1;
    }
    const value = await vault.get(key);
    try {
      await io.writeClipboard(value);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard command failed.";
      io.stderr(renderClipboardFallbackMessage(key, message));
      return 1;
    }
    const clearAfterMs = readOptionalNonNegativeNumber(args, "--clear-after-ms");
    if (clearAfterMs === undefined) {
      io.stdout(`Copied ${key} to clipboard.`);
      return 0;
    }

    await sleep(clearAfterMs);
    await io.writeClipboard("");
    io.stdout([
      `Copied ${key} to clipboard.`,
      "Clipboard cleared."
    ].join("\n"));
    return 0;
  }

  if (command === "vault" && args[1] === "reveal") {
    const key = args[2];
    if (!key) {
      io.stderr("Missing vault key.");
      return 1;
    }
    if (!args.includes("--confirm")) {
      io.stderr("Vault reveal requires --confirm.");
      return 1;
    }

    const vault = getPersistentVault(io);
    if (!(await vault.has(key))) {
      io.stderr(`VAULT_ENTRY_NOT_FOUND: ${key}`);
      return 1;
    }
    io.stdout(await vault.reveal(key, { confirm: true }));
    return 0;
  }

  if (command === "vault" && args[1] === "remove") {
    const key = args[2];
    if (!key) {
      io.stderr("Missing vault key.");
      return 1;
    }

    const vault = getPersistentVault(io);
    if (!(await vault.has(key))) {
      io.stderr(`VAULT_ENTRY_NOT_FOUND: ${key}`);
      return 1;
    }
    const syncEnv = args.includes("--sync-env") || await confirmEnvSync(io, key);
    await vault.remove(key);
    const updatedServices = await removeKeyFromProjectState(io.cwd, key);
    const output = [`Removed ${key}`];
    if (updatedServices > 0) {
      output.push(`Updated ${updatedServices} service state${updatedServices === 1 ? "" : "s"}.`);
    }
    if (syncEnv) {
      await removeKeyFromEnvLocal(io.cwd, key);
      output.push("Synced .env.local");
    } else {
      output.push(`Run baipiao vault remove ${key} --sync-env to remove it from .env.local.`);
    }
    io.stdout(output.join("\n"));
    return 0;
  }

  if (command === "vault" && args[1] === "health") {
    const rows = await loadVaultRows(io);
    io.stdout([
      "$ baipiao vault health",
      "",
      "KEY  SERVICE  STATUS  SCOPE  TEST",
      ...(rows.length > 0
        ? rows.map((row) => `${row.key}  ${row.serviceId}  ${row.status}  ${row.scope}  ${row.testState}`)
        : ["No vault entries."]),
      ...rows
        .filter((row) => row.key.includes("SERVICE_ROLE") || row.scope === "server")
        .map((row) => `risk: ${row.key} is server-only; do not expose it to clients.`)
    ].join("\n"));
    return rows.some((row) => row.status === "missing" || row.status === "invalid") ? 1 : 0;
  }

  if (command === "vault" && (!args[1] || args[1] === "list")) {
    const serviceFilter = readFlagValue(args, "--service");
    const rows = (await loadVaultRows(io)).filter((row) => serviceFilter === undefined || row.serviceId === serviceFilter);

    io.stdout([
      "$ baipiao vault list",
      "",
      "KEY  SERVICE  STATUS  SCOPE  TEST",
      ...(rows.length > 0
        ? rows.map((row) => `${row.key}  ${row.serviceId}  ${row.status}  ${row.scope}  ${row.testState}`)
        : ["No stored keys."])
    ].join("\n"));
    return 0;
  }

  if (command === "env" && args[1] === "generate") {
    if (args.includes("--example")) {
      const records = await loadProjectServiceRecords(io.cwd);
      const vaultRows = await loadVaultRows(io);
      const keys = [...new Set([
        ...records.flatMap((record) => record.envKeys),
        ...vaultRows.map((row) => row.key)
      ])].sort();
      const content = keys.length > 0 ? `${keys.map((key) => `${key}=`).join("\n")}\n` : "";
      await writeFile(join(io.cwd, ".env.example"), content, "utf8");
      io.stdout([
        "Written .env.example",
        ...keys.map((key) => `  ${key}`)
      ].join("\n"));
      return 0;
    }

    const envEntries = await loadEnvGenerationEntries(io);
    const generated = generateEnvFiles(envEntries, { includeUnverified: args.includes("--include-unverified") });
    await writeFile(join(io.cwd, ".env.local"), generated.envLocal, "utf8");
    io.stdout([
      "Written .env.local",
      ...envEntries.map((entry) => `  ${entry.key}`),
      ...generated.warnings.map((warning) => `warning: ${warning}`)
    ].join("\n"));
    return 0;
  }

  if (command === "test") {
    const serviceId = args[1];
    const services = await loadServiceConfigs();
    if (!serviceId) {
      const records = await loadProjectServiceRecordsSafe(io.cwd);
      if (records.length === 0) {
        io.stderr("No tracked services to test.");
        return 1;
      }

      const rows = [];
      for (const record of records) {
        const service = getServiceByIdOrSlug(services, record.serviceId);
        if (!service) {
          const candidate = await findFreeForDevNormalizedCandidate(io.cwd, record.serviceId);
          if (candidate) {
            rows.push(`${candidate.id}  skipped  Connection test is not supported for catalog-only services.`);
            continue;
          }
          rows.push(`${record.serviceId}  skipped  Connection test is not configured for custom services.`);
          continue;
        }
        const result = await runCliConnectionTest(io, service);
        rows.push(`${service.id}  ${result.status}  ${result.message}`);
      }

      io.stdout([
        "$ baipiao test",
        "",
        "SERVICE  STATUS  MESSAGE",
        ...rows
      ].join("\n"));
      return rows.some((row) => row.includes("  failed  ")) ? 1 : 0;
    }
    const service = getServiceByIdOrSlug(services, serviceId);
    if (!service) {
      const candidate = await findFreeForDevNormalizedCandidate(io.cwd, serviceId);
      if (!candidate) {
        const records = await loadProjectServiceRecordsSafe(io.cwd);
        if (records.some((record) => record.serviceId === serviceId)) {
          io.stdout([
            `$ baipiao test ${serviceId}`,
            `Service: ${serviceId}`,
            "Status: skipped",
            "OK: yes",
            "Message: Connection test is not configured for custom services."
          ].join("\n"));
          return 0;
        }
        io.stderr(`SERVICE_NOT_FOUND: ${serviceId}`);
        return 1;
      }
      io.stdout([
        `$ baipiao test ${serviceId}`,
        `Service: ${candidate.name}`,
        "Status: skipped",
        "OK: yes",
        "Message: Connection test is not supported for catalog-only services."
      ].join("\n"));
      return 0;
    }

    const result = await runCliConnectionTest(io, service);
    io.stdout([
      `$ baipiao test ${serviceId}`,
      `Service: ${service.name}`,
      `Status: ${result.status}`,
      `OK: ${result.ok ? "yes" : "no"}`,
      `Message: ${result.message}`,
      ...(result.latencyMs === undefined ? [] : [`Latency: ${result.latencyMs}ms`])
    ].join("\n"));
    return result.status === "failed" ? 1 : 0;
  }

  if (command === "catalog" && args[1] === "sources") {
    const source = await loadCatalogSourceMetadata(io.cwd);
    io.stdout([
      "$ baipiao catalog sources",
      "",
      `name: ${source.name}`,
      `url: ${source.url}`,
      `rawUrl: ${source.rawUrl}`,
      `license: ${source.license ?? "unknown"}`,
      `importedAt: ${source.importedAt ?? "not_imported"}`,
      `etag: ${source.etag ?? "-"}`,
      `commitSha: ${source.commitSha ?? "-"}`,
      `lastStatus: ${source.lastStatus ?? "not_imported"}`,
      `stale: ${String(source.stale ?? false)}`,
      `candidateCount: ${source.candidateCount ?? 0}`
    ].join("\n"));
    return 0;
  }

  const catalogResult = await runCatalogCommand(args, io);
  if (catalogResult !== undefined) {
    return catalogResult;
  }

  if (command === "catalog" && args[1] === "refresh") {
    const source = readCatalogSourceArg(args);
    if (!source) {
      io.stderr("Missing catalog source.");
      return 1;
    }
    if (source !== "free-for-dev") {
      io.stderr(`Unsupported catalog source: ${source}`);
      return 1;
    }

    const result = await refreshFreeForDevSource({
      cwd: io.cwd,
      ...(io.fetchText ? { fetchText: io.fetchText } : {})
    });
    io.stdout([
      "$ baipiao catalog refresh --source free-for-dev",
      "",
      `imported: ${result.imported}`,
      `updated: ${result.updated}`,
      `skipped: ${result.skipped}`,
      `needsReview: ${result.needsReview}`,
      `errors: ${result.errors}`,
      `stale: ${String(result.stale)}`,
      `rawSnapshotPath: ${result.rawSnapshotPath}`,
      `importSnapshotPath: ${result.importSnapshotPath}`
    ].join("\n"));
    return result.errors > 0 ? 1 : 0;
  }

  if (command === "catalog" && args[1] === "review") {
    const targetId = args[2];
    const nextStatus = getCatalogReviewStatus(args);
    if (targetId && nextStatus) {
      try {
        await updateCatalogReviewStatus(io.cwd, targetId, nextStatus);
        io.stdout(`Updated ${targetId}: ${nextStatus}`);
        return 0;
      } catch (error) {
        io.stderr(error instanceof Error ? error.message : `Catalog review update failed: ${targetId}`);
        return 1;
      }
    }

    const candidates = await loadCatalogReviewCandidates(io.cwd);
    io.stdout([
      "$ baipiao catalog review",
      "",
      "STATUS  ID  NAME  CATEGORY  SOURCE_CATEGORY  SOURCE  CONFIDENCE  URL  FREE_TIER  WARNINGS",
      ...(candidates.length > 0
        ? candidates.map((candidate) => [
          candidate.reviewStatus,
          candidate.id,
          candidate.name,
          candidate.category,
          candidate.sourceCategory,
          candidate.source.id,
          candidate.confidence,
          candidate.url,
          candidate.freeTierText,
          candidate.warnings.join("; ") || "-"
        ].join("  "))
        : ["No needs_review candidates."])
    ].join("\n"));
    return 0;
  }

  io.stderr(`Unknown command: ${command}`);
  return 1;
}

function renderHelp(): string {
  return [
    "baipiao",
    "",
    "Commands:",
    "  baipiao init [--name <name>]",
    "  baipiao search <query>",
    "  baipiao info <service>",
    "  baipiao prompt <service> [--copy]",
    "  baipiao setup <service>",
    "  baipiao setup-stack <stack>",
    "  baipiao output <service>",
    "  baipiao catalog <candidates|categories|localize|translation-batch|refresh|sources|review>",
    "  baipiao vault",
    "  baipiao vault [list|set|import|copy|reveal|remove|health]",
    "  baipiao env generate",
    "  baipiao test [service]",
    "  baipiao status",
    "  baipiao stack recommend <type>",
    "  baipiao mcp install <cursor|claude|codex>",
    "  baipiao mcp [--stdio]",
    "  baipiao mcp --port 7331"
  ].join("\n");
}

async function outputPrompt(prompt: string, args: string[], io: CliIO): Promise<number> {
  if (!args.includes("--copy")) {
    io.stdout(prompt);
    return 0;
  }

  if (!io.writeClipboard) {
    io.stderr("Clipboard is unavailable in this environment.");
    return 1;
  }

  await io.writeClipboard(prompt);
  io.stdout([prompt, "", "Copied prompt to clipboard."].join("\n"));
  return 0;
}

function readFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function readPort(args: string[]): number | null | undefined {
  const portValue = readFlagValue(args, "--port");
  if (portValue === undefined) {
    return undefined;
  }

  const trimmed = portValue.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const port = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return null;
  }

  return port;
}

function readOptionalNonNegativeNumber(args: string[], flag: string): number | undefined {
  const value = readFlagValue(args, flag);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readHiddenVaultValue(io: CliIO, key: string | undefined): Promise<string | undefined> {
  if (!key || !io.readSecret) {
    return Promise.resolve(undefined);
  }

  return io.readSecret(`Enter value for ${key}: `);
}

function renderClipboardFallbackMessage(key: string, failure?: string): string {
  return [
    failure ? `Clipboard copy failed: ${failure}` : "Clipboard is unavailable in this environment.",
    `Fallback: baipiao vault reveal ${key} --confirm`,
    "This prints the secret to stdout; use only in a trusted terminal."
  ].join("\n");
}

async function validateVaultSetValue(options: {
  key: string;
  value: string;
  serviceId?: string;
}): Promise<string | undefined> {
  if (!options.serviceId) {
    return undefined;
  }

  const services = await loadServiceConfigs();
  const service = getServiceByIdOrSlug(services, options.serviceId);
  if (!service) {
    return undefined;
  }

  const envSpec = service.config?.env?.find((spec) => spec.key === options.key);
  if (!envSpec?.pattern) {
    return undefined;
  }

  if (!new RegExp(envSpec.pattern).test(options.value)) {
    return `SECRET_VALIDATION_FAILED: Value does not match required pattern for ${options.key}.`;
  }

  return undefined;
}

function readPackageVersion(): string {
  try {
    return (require("../package.json") as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function readCatalogSourceArg(args: string[]): string | undefined {
  if (args.includes("--source")) {
    return readFlagValue(args, "--source");
  }
  return args[2]?.startsWith("--") ? "free-for-dev" : args[2] ?? "free-for-dev";
}

async function tryUpdateState(
  cwd: string,
  update: Parameters<typeof updateProjectServiceState>[1]
): Promise<void> {
  try {
    await updateProjectServiceState(cwd, update);
  } catch {
    // Commands like search/prompt can run outside an initialized project.
  }
}

async function tryArchiveAgentOutput(cwd: string, serviceId: string, markdown: string): Promise<void> {
  if (!(await hasInitializedProject(cwd))) {
    return;
  }
  const outputDir = join(cwd, ".baipiao", "outputs");
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, `${serviceId}.md`), markdown, "utf8");
}

type StoredServiceRecord = {
  serviceId: string;
  state: ServiceState;
  envKeys: string[];
  configKeys?: string[];
  lastTestAt?: string;
};

type VaultDisplayRow = {
  key: string;
  serviceId: string;
  status: VaultEntryMetadata["status"];
  scope: VaultEntryMetadata["scope"];
  testState: "tested" | "not_tested";
};

async function loadProjectServiceRecords(cwd: string): Promise<StoredServiceRecord[]> {
  const raw = await readFile(join(cwd, ".baipiao", "services.json"), "utf8");
  const parsed = JSON.parse(raw) as { services?: StoredServiceRecord[] };
  return parsed.services ?? [];
}

async function loadProjectServiceRecordsSafe(cwd: string): Promise<StoredServiceRecord[]> {
  try {
    return await loadProjectServiceRecords(cwd);
  } catch {
    return [];
  }
}

async function loadProjectNameSafe(cwd: string): Promise<string> {
  try {
    const parsed = JSON.parse(await readFile(join(cwd, ".baipiao", "project.json"), "utf8")) as { name?: string };
    return parsed.name ?? "baipiao";
  } catch {
    return "baipiao";
  }
}

function toStatusRow(
  record: StoredServiceRecord,
  services: ServiceRecord[]
): (StatusServiceRow & { category: string }) | undefined {
  const service = getServiceByIdOrSlug(services, record.serviceId);
  if (!service) {
    return undefined;
  }

  return {
    name: service.name,
    category: service.category,
    state: record.state,
    testState: record.state === "tested" ? "tested" : record.state === "failed" ? "failed" : "not_tested"
  };
}

function getPersistentVault(io: CliIO): VaultService {
  return io.vault ?? new FileVaultService({ cwd: io.cwd });
}

async function runCliConnectionTest(
  io: CliIO,
  service: ServiceRecord
): Promise<Awaited<ReturnType<typeof runConnectionTest>>> {
  const options: Parameters<typeof runConnectionTest>[0] = {
    service,
    env: await loadTestEnv(io, service)
  };
  if (io.testFetch) {
    options.fetch = io.testFetch;
  }
  return runConnectionTest(options);
}

function runCliWorkflowConnectionTest(
  io: CliIO,
  service: ServiceRecord,
  env: Record<string, string>
): Promise<Awaited<ReturnType<typeof runConnectionTest>>> {
  const options: Parameters<typeof runConnectionTest>[0] = { service, env };
  if (io.testFetch) {
    options.fetch = io.testFetch;
  }
  return runConnectionTest(options);
}

async function loadTestEnv(io: CliIO, service: ServiceRecord): Promise<Record<string, string>> {
  const vault = getPersistentVault(io);
  const env: Record<string, string> = {};
  const expectedKeys = service.config?.env?.map((entry) => entry.key) ?? [];
  for (const key of expectedKeys) {
    if (await vault.has(key)) {
      env[key] = await vault.get(key);
    }
  }
  return env;
}

async function getWorkflowVault(io: CliIO): Promise<VaultService> {
  if (io.vault) {
    return io.vault;
  }
  if (await hasInitializedProject(io.cwd)) {
    return new FileVaultService({ cwd: io.cwd });
  }
  return new MemoryVaultService();
}

async function hasInitializedProject(cwd: string): Promise<boolean> {
  try {
    await readFile(join(cwd, ".baipiao", "project.json"), "utf8");
    return true;
  } catch {
    return false;
  }
}

async function loadVaultRows(io: CliIO): Promise<VaultDisplayRow[]> {
  const [entries, records] = await Promise.all([
    getPersistentVault(io).list(),
    loadProjectServiceRecordsSafe(io.cwd)
  ]);
  const rows = entries.map((entry): VaultDisplayRow => ({
    key: entry.key,
    serviceId: entry.serviceId ?? findRecordServiceForKey(records, entry.key) ?? "-",
    status: entry.status,
    scope: entry.scope,
    testState: entry.lastTestAt ? "tested" : "not_tested"
  }));
  const storedKeys = new Set(entries.map((entry) => entry.key));

  for (const record of records) {
    for (const key of record.envKeys) {
      if (storedKeys.has(key)) {
        continue;
      }
      const classification = classifyVaultKey(key);
      rows.push({
        key,
        serviceId: record.serviceId,
        status: "missing",
        scope: classification.scope,
        testState: record.lastTestAt ? "tested" : "not_tested"
      });
    }
  }

  return rows.sort((left, right) => left.key.localeCompare(right.key));
}

async function loadEnvGenerationEntries(io: CliIO): Promise<Parameters<typeof generateEnvFiles>[0]> {
  const vault = getPersistentVault(io);
  const [entries, records] = await Promise.all([
    vault.list(),
    loadProjectServiceRecordsSafe(io.cwd)
  ]);
  const stateByKey = new Map<string, ServiceState>();
  for (const record of records) {
    for (const key of record.envKeys) {
      stateByKey.set(key, record.state);
    }
  }
  const keys = records.length > 0
    ? [...new Set(records.flatMap((record) => record.envKeys))]
    : entries.map((entry) => entry.key);

  const generated: Parameters<typeof generateEnvFiles>[0] = [];
  for (const key of keys) {
    if (!entries.some((entry) => entry.key === key)) {
      continue;
    }
    generated.push({
      key,
      value: await vault.get(key),
      state: toEnvGenerationState(stateByKey.get(key))
    });
  }

  return generated;
}

async function syncEnvLocalFile(io: CliIO): Promise<{ updated: boolean; warnings: string[] }> {
  if (!(await hasInitializedProject(io.cwd))) {
    return { updated: false, warnings: [] };
  }

  const generated = generateEnvFiles(await loadEnvGenerationEntries(io));
  await writeFile(join(io.cwd, ".env.local"), generated.envLocal, "utf8");
  return {
    updated: generated.envLocal.length > 0,
    warnings: generated.warnings
  };
}

function findRecordServiceForKey(records: StoredServiceRecord[], key: string): string | undefined {
  return records.find((record) => record.envKeys.includes(key))?.serviceId;
}

function toEnvGenerationState(state: ServiceState | undefined): Parameters<typeof generateEnvFiles>[0][number]["state"] {
  if (state === "tested") {
    return "tested";
  }
  if (state === "failed") {
    return "failed";
  }
  if (state === "configured_unverified") {
    return "configured_unverified";
  }
  return "configured";
}

type SetupTargetService =
  | {
    kind: "service";
    service: ServiceRecord;
  }
  | {
    kind: "candidate";
    service: ServiceRecord;
    candidate: CatalogNormalizedItem;
  };

async function resolveSetupTarget(cwd: string, serviceId: string): Promise<SetupTargetService | undefined> {
  const services = await loadServiceConfigs();
  const service = getServiceByIdOrSlug(services, serviceId);
  if (service) {
    return { kind: "service", service };
  }

  const candidate = await findFreeForDevNormalizedCandidate(cwd, serviceId);
  if (!candidate) {
    return undefined;
  }

  return {
    kind: "candidate",
    candidate,
    service: toServiceRecord(candidate)
  };
}

function toServiceRecord(candidate: CatalogNormalizedItem): ServiceRecord {
  return {
    id: candidate.id,
    name: candidate.name,
    slug: candidate.slug,
    category: candidate.category,
    capability: candidate.capability,
    description: candidate.description,
    url: candidate.url,
    source: {
      name: candidate.source.id,
      id: candidate.source.id,
      url: candidate.source.url,
      rawUrl: candidate.source.rawUrl,
      importedAt: candidate.source.importedAt
    }
  };
}

async function confirmEnvSync(io: CliIO, key: string): Promise<boolean> {
  if (!io.confirm) {
    return false;
  }

  return io.confirm(`Remove ${key} from .env.local? `);
}

async function removeKeyFromProjectState(cwd: string, key: string): Promise<number> {
  const records = await loadProjectServiceRecordsSafe(cwd);
  let updated = 0;

  for (const record of records) {
    const nextEnvKeys = record.envKeys.filter((envKey) => envKey !== key);
    const nextConfigKeys = (record.configKeys ?? []).filter((configKey) => configKey !== key);
    if (nextEnvKeys.length === record.envKeys.length && nextConfigKeys.length === (record.configKeys ?? []).length) {
      continue;
    }

    updated += 1;
    await tryUpdateState(cwd, {
      serviceId: record.serviceId,
      state: nextEnvKeys.length === 0 && nextConfigKeys.length === 0 ? "not_started" : record.state,
      envKeys: nextEnvKeys,
      configKeys: nextConfigKeys
    });
  }

  return updated;
}

async function removeKeyFromEnvLocal(cwd: string, key: string): Promise<void> {
  const path = join(cwd, ".env.local");
  let raw = "";
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return;
  }

  const keyPattern = new RegExp(`^\\s*(?:export\\s+)?${escapeRegExp(key)}\\s*=`);
  const nextLines = raw.split(/\r?\n/).filter((line) => line === "" || !keyPattern.test(line));
  while (nextLines.length > 0 && nextLines[nextLines.length - 1] === "") {
    nextLines.pop();
  }
  await writeFile(path, nextLines.length > 0 ? `${nextLines.join("\n")}\n` : "", "utf8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isStackRecommendationInput(value: string | undefined): value is Parameters<typeof recommendStack>[0] {
  return value === "ai_saas"
    || value === "rag"
    || value === "blog"
    || value === "agent_tool"
    || value === "mobile_app"
    || value === "custom"
    || value === "ai-basic";
}

function isSupportedMcpClient(value: string | undefined): value is SupportedMcpClient {
  return supportedMcpClients.includes(value as SupportedMcpClient);
}

type CatalogSourceMetadata = {
  name: string;
  url: string;
  rawUrl: string;
  license?: string;
  importedAt?: string;
  etag?: string;
  commitSha?: string;
  lastStatus?: string;
  stale?: boolean;
  candidateCount?: number;
};

async function loadCatalogSourceMetadata(cwd: string): Promise<CatalogSourceMetadata> {
  try {
    return JSON.parse(
      await readFile(join(cwd, "registry", "sources", "free-for-dev", "source.json"), "utf8")
    ) as CatalogSourceMetadata;
  } catch {
    return {
      name: "free-for-dev",
      url: "https://github.com/ripienaar/free-for-dev",
      rawUrl: "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md",
      lastStatus: "not_imported",
      stale: false,
      candidateCount: 0
    };
  }
}

type CatalogReviewCandidate = {
  id: string;
  name: string;
  category: string;
  sourceCategory: string;
  source: {
    id: string;
  };
  confidence: string;
  url: string;
  freeTierText: string;
  warnings: string[];
  reviewStatus: string;
};

type CatalogReviewStatus = "accepted" | "rejected" | "reviewed";

async function loadCatalogReviewCandidates(cwd: string): Promise<CatalogReviewCandidate[]> {
  let raw: string;
  try {
    raw = await readFile(join(cwd, "registry", "sources", "free-for-dev", "normalized.json"), "utf8");
  } catch {
    return [];
  }
  const parsed = JSON.parse(raw) as { items?: CatalogReviewCandidate[] };
  return (parsed.items ?? [])
    .filter((item) => item.reviewStatus === "needs_review")
    .slice(0, 10);
}

async function updateCatalogReviewStatus(
  cwd: string,
  targetId: string,
  nextStatus: CatalogReviewStatus
): Promise<void> {
  const catalogPath = join(cwd, "registry", "sources", "free-for-dev", "normalized.json");
  const parsed = JSON.parse(await readFile(catalogPath, "utf8")) as { items?: CatalogReviewCandidate[] };
  const items = parsed.items ?? [];
  const target = items.find((item) => item.id === targetId);
  if (!target) {
    throw new Error(`Catalog review candidate not found: ${targetId}`);
  }
  target.reviewStatus = nextStatus;
  await writeFile(catalogPath, `${JSON.stringify({ ...parsed, items }, null, 2)}\n`, "utf8");
}

function getCatalogReviewStatus(args: string[]): CatalogReviewStatus | undefined {
  if (args.includes("--accept")) {
    return "accepted";
  }
  if (args.includes("--reject")) {
    return "rejected";
  }
  if (args.includes("--mark-reviewed")) {
    return "reviewed";
  }
  return undefined;
}

function getSystemLocale(): string | undefined {
  return process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG;
}

if (isCliEntrypoint(process.argv[1])) {
  const code = await runCli(process.argv, createDefaultCliIO());
  process.exitCode = code;
}

function isCliEntrypoint(entrypoint: string | undefined): boolean {
  if (!entrypoint) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(realpathSync(entrypoint)).href;
  } catch {
    return import.meta.url === pathToFileURL(entrypoint).href;
  }
}
