import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { BaipiaoError } from "../errors/index.js";
import {
  classifyVaultKey,
  FileVaultService,
  maskKnownSecretsInText,
  maskSecretValue,
  MemoryVaultService,
  PlatformVaultService
} from "./index.js";

let tmpPaths: string[] = [];

describe("vault service", () => {
  afterEach(async () => {
    await Promise.all(tmpPaths.map((path) => rm(path, { recursive: true, force: true })));
    tmpPaths = [];
  });

  it("classifies common secret and public keys including Supabase anon key", () => {
    expect(classifyVaultKey("GROQ_API_KEY")).toMatchObject({
      secret: true,
      public: false,
      scope: "server"
    });
    expect(classifyVaultKey("SUPABASE_URL")).toMatchObject({
      secret: false,
      public: true,
      scope: "public"
    });
    expect(classifyVaultKey("SUPABASE_ANON_KEY")).toMatchObject({
      secret: true,
      public: true,
      scope: "public"
    });
  });

  it("lists vault metadata without cleartext values", async () => {
    const vault = new MemoryVaultService();
    await vault.set("GROQ_API_KEY", "gsk_abcdefghijklmnopqrstuvwxyz1234", { serviceId: "groq" });

    expect(await vault.get("GROQ_API_KEY")).toBe("gsk_abcdefghijklmnopqrstuvwxyz1234");
    expect(await vault.list()).toEqual([
      expect.objectContaining({
        key: "GROQ_API_KEY",
        valueRef: "memory:GROQ_API_KEY",
        secret: true,
        status: "stored",
        serviceId: "groq"
      })
    ]);
    expect(JSON.stringify(await vault.list())).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });

  it("persists encrypted fallback vault entries without storing cleartext", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-vault-"));
    tmpPaths.push(cwd);
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const vault = new FileVaultService({ cwd, keyMaterial: "test-key" });

    await vault.set("GROQ_API_KEY", secret, { serviceId: "groq" });

    const stored = await readFile(join(cwd, ".baipiao", "vault.local.json"), "utf8");
    expect(stored).not.toContain(secret);
    expect(await vault.list()).toEqual([
      expect.objectContaining({
        key: "GROQ_API_KEY",
        valueRef: "file:GROQ_API_KEY",
        serviceId: "groq",
        status: "stored"
      })
    ]);
    await expect(new FileVaultService({ cwd, keyMaterial: "test-key" }).get("GROQ_API_KEY")).resolves.toBe(secret);
  });

  it("stores values through platform secret storage commands and persists metadata only", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-vault-platform-"));
    tmpPaths.push(cwd);
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const commands: Array<{ command: string; args: string[]; input?: string }> = [];
    const vault = new PlatformVaultService({
      cwd,
      platform: "linux",
      runCommand: (invocation) => {
        commands.push(invocation);
        return Promise.resolve({
          stdout: invocation.args[0] === "lookup" ? secret : ""
        });
      }
    });

    await vault.set("GROQ_API_KEY", secret, { serviceId: "groq" });
    await expect(vault.get("GROQ_API_KEY")).resolves.toBe(secret);
    const metadata = await readFile(join(cwd, ".baipiao", "vault.platform.json"), "utf8");
    await vault.remove("GROQ_API_KEY");

    expect(commands).toEqual([
      {
        command: "secret-tool",
        args: ["store", "--label", "baipiao:GROQ_API_KEY", "service", "baipiao", "key", "GROQ_API_KEY"],
        input: secret
      },
      {
        command: "secret-tool",
        args: ["lookup", "service", "baipiao", "key", "GROQ_API_KEY"]
      },
      {
        command: "secret-tool",
        args: ["clear", "service", "baipiao", "key", "GROQ_API_KEY"]
      }
    ]);
    expect(metadata).toContain("platform:GROQ_API_KEY");
    expect(metadata).not.toContain(secret);
  });

  it("reads Windows platform secrets through built-in credential APIs", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "baipiao-vault-platform-win32-"));
    tmpPaths.push(cwd);
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    const commands: Array<{ command: string; args: string[]; input?: string }> = [];
    const vault = new PlatformVaultService({
      cwd,
      platform: "win32",
      runCommand: (invocation) => {
        commands.push(invocation);
        return Promise.resolve({
          stdout: invocation.command === "powershell" ? secret : ""
        });
      }
    });

    await vault.set("GROQ_API_KEY", secret, { serviceId: "groq" });
    await expect(vault.get("GROQ_API_KEY")).resolves.toBe(secret);
    await vault.remove("GROQ_API_KEY");

    const readCommand = commands[1];
    expect(commands[0]).toMatchObject({
      command: "cmdkey",
      args: ["/generic:baipiao:GROQ_API_KEY", "/user:baipiao", `/pass:${secret}`]
    });
    expect(readCommand?.command).toBe("powershell");
    expect(readCommand?.args.join("\n")).toContain("CredReadW");
    expect(readCommand?.args.join("\n")).toContain("advapi32.dll");
    expect(readCommand?.args.join("\n")).not.toContain("Get-StoredCredential");
    expect(commands[2]).toMatchObject({
      command: "cmdkey",
      args: ["/delete:baipiao:GROQ_API_KEY"]
    });
  });

  it("requires explicit confirmation before reveal", async () => {
    const vault = new MemoryVaultService();
    await vault.set("GROQ_API_KEY", "gsk_abcdefghijklmnopqrstuvwxyz1234");

    await expect(vault.reveal("GROQ_API_KEY", { confirm: false })).rejects.toMatchObject({
      code: "VAULT_REVEAL_REQUIRES_CONFIRMATION"
    });
    await expect(vault.reveal("GROQ_API_KEY", { confirm: true })).resolves.toBe("gsk_abcdefghijklmnopqrstuvwxyz1234");
  });

  it("masks secret values for logs and terminal output", () => {
    expect(maskSecretValue("gsk_abcdefghijklmnopqrstuvwxyz1234")).toBe("gsk_**************************1234");
    expect(maskSecretValue("short")).toBe("*****");
    expect(maskKnownSecretsInText("CUSTOM_API_KEY=plain-value-without-known-prefix")).toBe(
      `CUSTOM_API_KEY=${maskSecretValue("plain-value-without-known-prefix")}`
    );
    expect(maskKnownSecretsInText("PUBLIC_URL=https://example.com")).toBe("PUBLIC_URL=https://example.com");
  });

  it("throws documented errors for missing entries", async () => {
    const vault = new MemoryVaultService();

    await expect(vault.get("MISSING_KEY")).rejects.toBeInstanceOf(BaipiaoError);
    await expect(vault.get("MISSING_KEY")).rejects.toMatchObject({
      code: "VAULT_ENTRY_NOT_FOUND",
      recoverable: true
    });
  });

  it("imports text, checks presence, copies, and reports health without cleartext", async () => {
    const vault = new MemoryVaultService();
    const secret = "gsk_abcdefghijklmnopqrstuvwxyz1234";
    let clipboard = "";

    const imported = await vault.importText(`GROQ_API_KEY=${secret}`, { serviceId: "groq" });
    const copied = await vault.copy("GROQ_API_KEY", (value) => {
      clipboard = value;
    });
    const health = await vault.health([
      { key: "GROQ_API_KEY", serviceId: "groq" },
      { key: "OPENROUTER_API_KEY", serviceId: "openrouter" }
    ]);

    expect(imported.saved).toEqual([
      expect.objectContaining({
        key: "GROQ_API_KEY",
        serviceId: "groq",
        status: "stored"
      })
    ]);
    expect(imported.failed).toEqual([]);
    await expect(vault.has("GROQ_API_KEY")).resolves.toBe(true);
    await expect(vault.has("OPENROUTER_API_KEY")).resolves.toBe(false);
    expect(copied).toEqual({ key: "GROQ_API_KEY", copied: true });
    expect(clipboard).toBe(secret);
    expect(health).toEqual([
      expect.objectContaining({ key: "GROQ_API_KEY", serviceId: "groq", status: "warning" }),
      expect.objectContaining({ key: "OPENROUTER_API_KEY", serviceId: "openrouter", status: "missing" })
    ]);
    expect(JSON.stringify(imported)).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
    expect(JSON.stringify(health)).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });
});
