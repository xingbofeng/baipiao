import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import { MemoryVaultService } from "baipiao-core";
import { startStdioMcpServer } from "./stdio.js";

describe("MCP stdio transport", () => {
  it("handles JSON-RPC frames over stdio streams", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const frames: string[] = [];
    output.on("data", (chunk: Buffer) => frames.push(chunk.toString("utf8")));

    const transport = await startStdioMcpServer({
      stdin: input,
      stdout: output,
      vault: new MemoryVaultService()
    });

    input.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "list_services",
        arguments: { query: "llm" }
      }
    })}\n`);

    await waitFor(() => frames.join("").includes("\"id\":1"));
    await transport.close();

    const response = JSON.parse(frames.join("").trim()) as {
      jsonrpc: string;
      id: number;
      result: { output: { services: Array<{ id: string }> } };
    };
    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        tool: "list_services"
      }
    });
    expect(response.result.output.services.map((service) => service.id)).toContain("free-for-dev:generative-ai:openrouter");
  });
});

async function waitFor(assertion: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (assertion()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Timed out waiting for stdio MCP frame.");
}
