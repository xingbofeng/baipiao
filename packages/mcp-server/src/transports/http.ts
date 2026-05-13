import { createServer, type IncomingMessage, type Server } from "node:http";

import { FileVaultService, maskKnownSecretsInText, type VaultService } from "baipiao-core";

import { handleJsonRpcRequest } from "../protocol/envelope.js";
import { createMcpToolHandlers } from "../tools/handlers.js";

export const httpTransportName = "http";

export type StartHttpMcpServerOptions = {
  cwd?: string;
  port?: number;
  vault?: VaultService;
  stderr?: NodeJS.WritableStream;
};

export async function startHttpMcpServer(options: StartHttpMcpServerOptions = {}): Promise<Server> {
  const port = options.port ?? 7331;
  const vault = options.vault ?? new FileVaultService({ cwd: options.cwd ?? process.cwd() });
  const handlers = createMcpToolHandlers({ vault, cwd: options.cwd ?? process.cwd() });
  const stderr = options.stderr ?? null;

  const server = createServer((request: IncomingMessage, response) => {
    void handleHttpRequest({ request, response, stderr, handlers });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve();
    });
  });

  return server;
}

type RequestChunk = Buffer | string;
type HttpHeaders = { [key: string]: number | string | string[] | undefined };

type HttpResponseWriter = {
  writeHead: (statusCode: number, headers?: HttpHeaders) => void;
  end: (chunk?: string | Buffer) => void;
};

export type HttpMcpPayloadResponse = {
  statusCode: number;
  headers: HttpHeaders;
  body: string;
};

export async function handleHttpMcpPayload(input: {
  method: string | undefined;
  url: string | undefined;
  body: string;
  stderr?: NodeJS.WritableStream | null;
  handlers: ReturnType<typeof createMcpToolHandlers>;
}): Promise<HttpMcpPayloadResponse> {
  const { method, url, body, stderr, handlers: localHandlers } = input;

  if (method !== "POST" || url !== "/mcp") {
    return jsonResponse(404, {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: "MCP_PROTOCOL_INVALID_REQUEST",
        message: "Invalid MCP HTTP request method or path."
      }
    });
  }

  try {
    const payload = body.length > 0 ? JSON.parse(body) as unknown : undefined;
    const rpcResponse = await handleJsonRpcRequest(payload, localHandlers);
    if (rpcResponse === undefined) {
      return {
        statusCode: 202,
        headers: {},
        body: ""
      };
    }
    return jsonResponse(200, rpcResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP HTTP request failed.";
    const responseBody = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: "MCP_PROTOCOL_INVALID_REQUEST",
        message: maskKnownSecretsInText(message)
      }
    };
    stderr?.write(`${JSON.stringify(responseBody)}\n`);
    return jsonResponse(200, responseBody);
  }
}

async function handleHttpRequest(input: {
  request: IncomingMessage;
  response: HttpResponseWriter;
  stderr: NodeJS.WritableStream | null;
  handlers: ReturnType<typeof createMcpToolHandlers>;
}): Promise<void> {
  const { request, response, stderr, handlers: localHandlers } = input;

  const body = request.method === "POST" && request.url === "/mcp"
    ? await readRequestBody(request)
    : "";
  const result = await handleHttpMcpPayload({
    method: request.method,
    url: request.url,
    body,
    stderr,
    handlers: localHandlers
  });
  response.writeHead(result.statusCode, result.headers);
  response.end(result.body);
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    let totalLength = 0;

    request.on("error", reject);
    request.on("data", (chunk: RequestChunk) => {
      const chunkLength = typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
      totalLength += chunkLength;
      if (totalLength > 1_000_000) {
        reject(new Error("Request body too large."));
        return;
      }
      chunks.push(chunk.toString("utf8"));
    });
    request.on("end", () => {
      resolve(chunks.join(""));
    });
  });
}

function jsonResponse(statusCode: number, payload: unknown): HttpMcpPayloadResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  };
}
