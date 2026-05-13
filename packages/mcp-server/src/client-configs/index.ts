export const supportedMcpClients = ["cursor", "claude", "codex"] as const;

export type SupportedMcpClient = (typeof supportedMcpClients)[number];

export type McpClientConfigOptions = {
  client: SupportedMcpClient;
  transport?: "stdio" | "http";
  port?: number;
};

export type McpClientConfig = {
  client: SupportedMcpClient;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
  localOnly?: boolean;
};

export function generateMcpClientConfig(options: McpClientConfigOptions): McpClientConfig {
  if (options.transport === "http") {
    const port = options.port ?? 7331;
    return {
      client: options.client,
      transport: "http",
      url: `http://127.0.0.1:${port}/mcp`,
      localOnly: true
    };
  }

  return {
    client: options.client,
    transport: "stdio",
    command: "baipiao",
    args: ["mcp"]
  };
}
