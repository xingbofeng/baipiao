import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { BaipiaoError } from "../errors/index.js";
import { parseAgentOutput } from "../parser/agentOutput.js";
import { VaultEntrySchema } from "../schemas/index.js";
export { maskKnownSecretsInText, maskSecretValue } from "../security/redaction.js";
import { maskKnownSecretsInText } from "../security/redaction.js";

export type VaultScope = "public" | "server" | "unknown";

export type VaultKeyClassification = {
  secret: boolean;
  public: boolean;
  required: boolean;
  scope: VaultScope;
};

export type VaultEntryMetadata = {
  key: string;
  valueRef: string;
  secret: boolean;
  public: boolean;
  required: boolean;
  status: "stored" | "missing" | "invalid" | "untested";
  scope: VaultScope;
  serviceId?: string | undefined;
  lastUpdatedAt?: string | undefined;
  lastTestAt?: string | undefined;
};

export type VaultSetOptions = {
  serviceId?: string;
  required?: boolean;
};

export type VaultRevealOptions = {
  confirm: boolean;
};

export type VaultImportOptions = {
  serviceId?: string;
};

export type VaultImportResult = {
  saved: VaultEntryMetadata[];
  failed: Array<{
    key: string;
    reason: string;
  }>;
  warnings: string[];
};

export type VaultClipboardWriter = (value: string) => Promise<void> | void;

export type VaultCopyResult = {
  key: string;
  copied: boolean;
};

export type VaultExpectedEntry = {
  key: string;
  serviceId?: string;
};

export type VaultHealthStatus = "ok" | "missing" | "invalid" | "warning";

export type VaultHealthItem = {
  key: string;
  status: VaultHealthStatus;
  message: string;
  serviceId?: string;
};

export type VaultService = {
  set(key: string, value: string, options?: VaultSetOptions): Promise<VaultEntryMetadata>;
  get(key: string): Promise<string>;
  has(key: string): Promise<boolean>;
  list(): Promise<VaultEntryMetadata[]>;
  importText(text: string, options?: VaultImportOptions): Promise<VaultImportResult>;
  copy(key: string, writeClipboard: VaultClipboardWriter): Promise<VaultCopyResult>;
  reveal(key: string, options: VaultRevealOptions): Promise<string>;
  remove(key: string): Promise<void>;
  health(expectedEntries?: VaultExpectedEntry[]): Promise<VaultHealthItem[]>;
};

const SECRET_PATTERNS = [
  "KEY",
  "TOKEN",
  "SECRET",
  "PASSWORD",
  "PRIVATE",
  "CREDENTIAL",
  "ACCESS_KEY",
  "SERVICE_ROLE"
];

const PUBLIC_PATTERNS = [
  "URL",
  "ENDPOINT",
  "PROJECT_ID",
  "BUCKET_NAME",
  "PUBLIC_KEY",
  "ANON_KEY"
];

export function classifyVaultKey(key: string): VaultKeyClassification {
  const upper = key.toUpperCase();
  const isSupabaseAnon = upper === "SUPABASE_ANON_KEY";
  const secret = isSupabaseAnon || SECRET_PATTERNS.some((pattern) => upper.includes(pattern));
  const publicValue = isSupabaseAnon || PUBLIC_PATTERNS.some((pattern) => upper.includes(pattern));

  return {
    secret,
    public: publicValue,
    required: true,
    scope: publicValue ? "public" : secret ? "server" : "unknown"
  };
}

export class MemoryVaultService implements VaultService {
  readonly #values = new Map<string, string>();
  readonly #entries = new Map<string, VaultEntryMetadata>();

  set(key: string, value: string, options: VaultSetOptions = {}): Promise<VaultEntryMetadata> {
    const classification = classifyVaultKey(key);
    const entry = VaultEntrySchema.parse({
      key,
      valueRef: `memory:${key}`,
      secret: classification.secret,
      public: classification.public,
      required: options.required ?? classification.required,
      status: "stored",
      scope: classification.scope,
      ...(options.serviceId ? { serviceId: options.serviceId } : {}),
      lastUpdatedAt: new Date().toISOString()
    });

    this.#values.set(key, value);
    this.#entries.set(key, entry);
    return Promise.resolve(entry);
  }

  get(key: string): Promise<string> {
    const value = this.#values.get(key);
    if (value === undefined) {
      return Promise.reject(new BaipiaoError("VAULT_ENTRY_NOT_FOUND", `Vault entry not found: ${key}`));
    }
    return Promise.resolve(value);
  }

  has(key: string): Promise<boolean> {
    return Promise.resolve(this.#values.has(key));
  }

  list(): Promise<VaultEntryMetadata[]> {
    return Promise.resolve([...this.#entries.values()]);
  }

  async importText(text: string, options: VaultImportOptions = {}): Promise<VaultImportResult> {
    return importVaultText(this, text, options);
  }

  async copy(key: string, writeClipboard: VaultClipboardWriter): Promise<VaultCopyResult> {
    await writeClipboard(await this.get(key));
    return { key, copied: true };
  }

  async reveal(key: string, options: VaultRevealOptions): Promise<string> {
    if (!options.confirm) {
      throw new BaipiaoError(
        "VAULT_REVEAL_REQUIRES_CONFIRMATION",
        "Vault reveal requires explicit CLI confirmation"
      );
    }

    return this.get(key);
  }

  remove(key: string): Promise<void> {
    this.#values.delete(key);
    this.#entries.delete(key);
    return Promise.resolve();
  }

  async health(expectedEntries: VaultExpectedEntry[] = []): Promise<VaultHealthItem[]> {
    return buildVaultHealth(await this.list(), expectedEntries);
  }
}

type EncryptedVaultValue = {
  iv: string;
  tag: string;
  ciphertext: string;
};

type StoredVaultEntry = VaultEntryMetadata & {
  encryptedValue: EncryptedVaultValue;
};

type FileVaultStore = {
  version: 1;
  warning: string;
  entries: StoredVaultEntry[];
};

type PlatformVaultStore = {
  version: 1;
  backend: "platform";
  entries: VaultEntryMetadata[];
};

export type FileVaultServiceOptions = {
  cwd: string;
  keyMaterial?: string;
  path?: string;
};

export class FileVaultService implements VaultService {
  readonly #path: string;
  readonly #key: Buffer;

  constructor(options: FileVaultServiceOptions) {
    this.#path = options.path ?? join(options.cwd, ".baipiao", "vault.local.json");
    this.#key = createHash("sha256")
      .update(options.keyMaterial ?? `${options.cwd}:baipiao-local-vault`)
      .digest();
  }

  async set(key: string, value: string, options: VaultSetOptions = {}): Promise<VaultEntryMetadata> {
    const store = await this.#readStore();
    const classification = classifyVaultKey(key);
    const previous = store.entries.find((entry) => entry.key === key);
    const entry = VaultEntrySchema.parse({
      key,
      valueRef: `file:${key}`,
      secret: classification.secret,
      public: classification.public,
      required: options.required ?? classification.required,
      status: "stored",
      scope: classification.scope,
      ...(options.serviceId ? { serviceId: options.serviceId } : previous?.serviceId ? { serviceId: previous.serviceId } : {}),
      lastUpdatedAt: new Date().toISOString(),
      ...(previous?.lastTestAt ? { lastTestAt: previous.lastTestAt } : {})
    });
    const storedEntry: StoredVaultEntry = {
      ...entry,
      encryptedValue: this.#encrypt(value)
    };
    const nextEntries = [
      ...store.entries.filter((stored) => stored.key !== key),
      storedEntry
    ].sort((left, right) => left.key.localeCompare(right.key));

    await this.#writeStore({ ...store, entries: nextEntries });
    return entry;
  }

  async get(key: string): Promise<string> {
    const store = await this.#readStore();
    const entry = store.entries.find((stored) => stored.key === key);
    if (!entry) {
      throw new BaipiaoError("VAULT_ENTRY_NOT_FOUND", `Vault entry not found: ${key}`);
    }
    return this.#decrypt(entry.encryptedValue);
  }

  async has(key: string): Promise<boolean> {
    const store = await this.#readStore();
    return store.entries.some((entry) => entry.key === key);
  }

  async list(): Promise<VaultEntryMetadata[]> {
    const store = await this.#readStore();
    return store.entries.map(({ encryptedValue: _encryptedValue, ...entry }) => entry);
  }

  async importText(text: string, options: VaultImportOptions = {}): Promise<VaultImportResult> {
    return importVaultText(this, text, options);
  }

  async copy(key: string, writeClipboard: VaultClipboardWriter): Promise<VaultCopyResult> {
    await writeClipboard(await this.get(key));
    return { key, copied: true };
  }

  async reveal(key: string, options: VaultRevealOptions): Promise<string> {
    if (!options.confirm) {
      throw new BaipiaoError(
        "VAULT_REVEAL_REQUIRES_CONFIRMATION",
        "Vault reveal requires explicit CLI confirmation"
      );
    }

    return this.get(key);
  }

  async remove(key: string): Promise<void> {
    const store = await this.#readStore();
    await this.#writeStore({
      ...store,
      entries: store.entries.filter((entry) => entry.key !== key)
    });
  }

  async health(expectedEntries: VaultExpectedEntry[] = []): Promise<VaultHealthItem[]> {
    return buildVaultHealth(await this.list(), expectedEntries);
  }

  async #readStore(): Promise<FileVaultStore> {
    try {
      const parsed = JSON.parse(await readFile(this.#path, "utf8")) as Partial<FileVaultStore>;
      return {
        version: 1,
        warning: parsed.warning ?? "Local encrypted fallback vault. Prefer platform secure storage when available.",
        entries: parsed.entries ?? []
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          version: 1,
          warning: "Local encrypted fallback vault. Prefer platform secure storage when available.",
          entries: []
        };
      }
      throw error;
    }
  }

  async #writeStore(store: FileVaultStore): Promise<void> {
    await mkdir(dirname(this.#path), { recursive: true });
    await writeFile(this.#path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }

  #encrypt(value: string): EncryptedVaultValue {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.#key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return {
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64")
    };
  }

  #decrypt(value: EncryptedVaultValue): string {
    const decipher = createDecipheriv("aes-256-gcm", this.#key, Buffer.from(value.iv, "base64"));
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64")),
      decipher.final()
    ]);
    return plaintext.toString("utf8");
  }
}

export type PlatformVaultPlatform = "darwin" | "linux" | "win32";

export type PlatformCommandInvocation = {
  command: string;
  args: string[];
  input?: string;
};

export type PlatformCommandResult = {
  stdout: string;
  stderr?: string;
};

export type PlatformCommandRunner = (invocation: PlatformCommandInvocation) => Promise<PlatformCommandResult>;

export type PlatformVaultServiceOptions = {
  cwd: string;
  platform?: PlatformVaultPlatform;
  path?: string;
  runCommand?: PlatformCommandRunner;
};

export class PlatformVaultService implements VaultService {
  readonly #path: string;
  readonly #platform: PlatformVaultPlatform;
  readonly #runCommand: PlatformCommandRunner;

  constructor(options: PlatformVaultServiceOptions) {
    this.#path = options.path ?? join(options.cwd, ".baipiao", "vault.platform.json");
    this.#platform = options.platform ?? toPlatform(process.platform);
    this.#runCommand = options.runCommand ?? runPlatformCommand;
  }

  async set(key: string, value: string, options: VaultSetOptions = {}): Promise<VaultEntryMetadata> {
    await this.#runCommand(buildPlatformCommand(this.#platform, "set", key, value));
    const store = await this.#readStore();
    const previous = store.entries.find((entry) => entry.key === key);
    const classification = classifyVaultKey(key);
    const entry = VaultEntrySchema.parse({
      key,
      valueRef: `platform:${key}`,
      secret: classification.secret,
      public: classification.public,
      required: options.required ?? classification.required,
      status: "stored",
      scope: classification.scope,
      ...(options.serviceId ? { serviceId: options.serviceId } : previous?.serviceId ? { serviceId: previous.serviceId } : {}),
      lastUpdatedAt: new Date().toISOString(),
      ...(previous?.lastTestAt ? { lastTestAt: previous.lastTestAt } : {})
    });
    await this.#writeStore({
      ...store,
      entries: [
        ...store.entries.filter((stored) => stored.key !== key),
        entry
      ].sort((left, right) => left.key.localeCompare(right.key))
    });
    return entry;
  }

  async get(key: string): Promise<string> {
    if (!(await this.has(key))) {
      throw new BaipiaoError("VAULT_ENTRY_NOT_FOUND", `Vault entry not found: ${key}`);
    }
    const result = await this.#runCommand(buildPlatformCommand(this.#platform, "get", key));
    return result.stdout.trim();
  }

  async has(key: string): Promise<boolean> {
    const store = await this.#readStore();
    return store.entries.some((entry) => entry.key === key);
  }

  async list(): Promise<VaultEntryMetadata[]> {
    return (await this.#readStore()).entries;
  }

  async importText(text: string, options: VaultImportOptions = {}): Promise<VaultImportResult> {
    return importVaultText(this, text, options);
  }

  async copy(key: string, writeClipboard: VaultClipboardWriter): Promise<VaultCopyResult> {
    await writeClipboard(await this.get(key));
    return { key, copied: true };
  }

  async reveal(key: string, options: VaultRevealOptions): Promise<string> {
    if (!options.confirm) {
      throw new BaipiaoError(
        "VAULT_REVEAL_REQUIRES_CONFIRMATION",
        "Vault reveal requires explicit CLI confirmation"
      );
    }
    return this.get(key);
  }

  async remove(key: string): Promise<void> {
    await this.#runCommand(buildPlatformCommand(this.#platform, "remove", key));
    const store = await this.#readStore();
    await this.#writeStore({
      ...store,
      entries: store.entries.filter((entry) => entry.key !== key)
    });
  }

  async health(expectedEntries: VaultExpectedEntry[] = []): Promise<VaultHealthItem[]> {
    return buildVaultHealth(await this.list(), expectedEntries);
  }

  async #readStore(): Promise<PlatformVaultStore> {
    try {
      const parsed = JSON.parse(await readFile(this.#path, "utf8")) as Partial<PlatformVaultStore>;
      return {
        version: 1,
        backend: "platform",
        entries: parsed.entries ?? []
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          version: 1,
          backend: "platform",
          entries: []
        };
      }
      throw error;
    }
  }

  async #writeStore(store: PlatformVaultStore): Promise<void> {
    await mkdir(dirname(this.#path), { recursive: true });
    await writeFile(this.#path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function toPlatform(platform: NodeJS.Platform): PlatformVaultPlatform {
  if (platform === "darwin" || platform === "linux" || platform === "win32") {
    return platform;
  }
  throw new BaipiaoError("SECRET_SAVE_FAILED", `Unsupported platform Vault backend: ${platform}`);
}

function buildPlatformCommand(
  platform: PlatformVaultPlatform,
  action: "set" | "get" | "remove",
  key: string,
  value?: string
): PlatformCommandInvocation {
  const service = `baipiao:${key}`;
  if (platform === "linux") {
    switch (action) {
      case "set":
        return {
          command: "secret-tool",
          args: ["store", "--label", service, "service", "baipiao", "key", key],
          ...(value ? { input: value } : {})
        };
      case "get":
        return { command: "secret-tool", args: ["lookup", "service", "baipiao", "key", key] };
      case "remove":
        return { command: "secret-tool", args: ["clear", "service", "baipiao", "key", key] };
    }
  }

  if (platform === "darwin") {
    switch (action) {
      case "set":
        return {
          command: "security",
          args: ["add-generic-password", "-a", key, "-s", service, "-U", "-w", value ?? ""]
        };
      case "get":
        return { command: "security", args: ["find-generic-password", "-a", key, "-s", service, "-w"] };
      case "remove":
        return { command: "security", args: ["delete-generic-password", "-a", key, "-s", service] };
    }
  }

  switch (action) {
    case "set":
      return {
        command: "cmdkey",
        args: [`/generic:${service}`, "/user:baipiao", `/pass:${value ?? ""}`]
      };
    case "get":
      return {
        command: "powershell",
        args: [
          "-NoProfile",
          "-Command",
          buildWindowsCredentialReadScript(service)
        ]
      };
    case "remove":
      return { command: "cmdkey", args: [`/delete:${service}`] };
  }
}

function buildWindowsCredentialReadScript(service: string): string {
  return [
    "$ErrorActionPreference = 'Stop'",
    `$target = ${quotePowerShellString(service)}`,
    "$source = @'",
    "using System;",
    "using System.Runtime.InteropServices;",
    "public static class NativeCredential {",
    "  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]",
    "  public struct CREDENTIAL {",
    "    public uint Flags;",
    "    public uint Type;",
    "    public string TargetName;",
    "    public string Comment;",
    "    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;",
    "    public uint CredentialBlobSize;",
    "    public IntPtr CredentialBlob;",
    "    public uint Persist;",
    "    public uint AttributeCount;",
    "    public IntPtr Attributes;",
    "    public string TargetAlias;",
    "    public string UserName;",
    "  }",
    "  [DllImport(\"advapi32.dll\", SetLastError = true, CharSet = CharSet.Unicode)]",
    "  public static extern bool CredReadW(string target, uint type, uint flags, out IntPtr credentialPtr);",
    "  [DllImport(\"advapi32.dll\", SetLastError = true)]",
    "  public static extern void CredFree(IntPtr buffer);",
    "}",
    "'@",
    "Add-Type -TypeDefinition $source",
    "$credentialPtr = [IntPtr]::Zero",
    "if (-not [NativeCredential]::CredReadW($target, 1, 0, [ref]$credentialPtr)) { throw \"Credential not found: $target\" }",
    "try {",
    "  $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($credentialPtr, [type][NativeCredential+CREDENTIAL])",
    "  if ($credential.CredentialBlobSize -eq 0) { '' } else { [Runtime.InteropServices.Marshal]::PtrToStringUni($credential.CredentialBlob, [int]($credential.CredentialBlobSize / 2)) }",
    "} finally {",
    "  [NativeCredential]::CredFree($credentialPtr)",
    "}"
  ].join("\n");
}

function quotePowerShellString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function runPlatformCommand(invocation: PlatformCommandInvocation): Promise<PlatformCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(new BaipiaoError("SECRET_SAVE_FAILED", maskKnownSecretsInText(error.message)));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, ...(stderr ? { stderr } : {}) });
        return;
      }
      reject(new BaipiaoError(
        "SECRET_SAVE_FAILED",
        `Platform Vault command failed: ${maskKnownSecretsInText(stderr || String(code))}`
      ));
    });

    if (invocation.input) {
      child.stdin.write(invocation.input);
    }
    child.stdin.end();
  });
}

async function importVaultText(
  vault: Pick<VaultService, "set">,
  text: string,
  options: VaultImportOptions
): Promise<VaultImportResult> {
  const parsed = parseAgentOutput(text);
  const saved: VaultEntryMetadata[] = [];

  for (const entry of parsed.entries) {
    saved.push(await vault.set(entry.key, entry.value, {
      ...(options.serviceId ? { serviceId: options.serviceId } : {})
    }));
  }

  return {
    saved,
    failed: [],
    warnings: parsed.warnings
  };
}

function buildVaultHealth(entries: VaultEntryMetadata[], expectedEntries: VaultExpectedEntry[]): VaultHealthItem[] {
  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  const healthItems = entries.map((entry) => healthItemForEntry(entry));

  for (const expected of expectedEntries) {
    if (byKey.has(expected.key)) {
      continue;
    }
    healthItems.push({
      key: expected.key,
      ...(expected.serviceId ? { serviceId: expected.serviceId } : {}),
      status: "missing",
      message: `${expected.key} is missing.`
    });
  }

  return healthItems.sort((left, right) => left.key.localeCompare(right.key));
}

function healthItemForEntry(entry: VaultEntryMetadata): VaultHealthItem {
  const serverOnly = entry.scope === "server";
  return {
    key: entry.key,
    ...(entry.serviceId ? { serviceId: entry.serviceId } : {}),
    status: entry.status === "invalid" ? "invalid" : serverOnly ? "warning" : "ok",
    message: serverOnly ? `${entry.key} is server-only; do not expose it to clients.` : `${entry.key} is stored.`
  };
}
