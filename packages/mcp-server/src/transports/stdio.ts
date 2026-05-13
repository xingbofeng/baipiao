import type { Readable, Writable } from "node:stream";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { FileVaultService, maskKnownSecretsInText, type VaultService } from "baipiao-core";

import { handleJsonRpcRequest } from "../protocol/envelope.js";
import { createMcpToolHandlers } from "../tools/handlers.js";

export const stdioTransportName = "stdio";

export type StartStdioMcpServerOptions = {
  cwd?: string;
  stdin?: Readable;
  stdout?: Writable;
  stderr?: Writable;
  vault?: VaultService;
};

export async function startStdioMcpServer(
  options: StartStdioMcpServerOptions = {}
): Promise<StdioServerTransport> {
  const transport = new StdioServerTransport(options.stdin, options.stdout);
  const vault = options.vault ?? new FileVaultService({ cwd: options.cwd ?? process.cwd() });
  const handlers = createMcpToolHandlers(options.cwd === undefined ? { vault } : { vault, cwd: options.cwd });
  transport.onmessage = (message) => {
    void handleJsonRpcRequest(message, handlers)
      .then((response) => {
        if (response) {
          return transport.send(response as JSONRPCMessage);
        }
        return undefined;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "MCP stdio transport failed.";
        options.stderr?.write(`${maskKnownSecretsInText(message)}\n`);
      });
  };
  transport.onerror = (error) => {
    options.stderr?.write(`${maskKnownSecretsInText(error.message)}\n`);
  };
  await transport.start();
  return transport;
}
