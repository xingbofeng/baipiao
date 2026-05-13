import { describe, expect, it } from "vitest";
import { generateMcpClientConfig, supportedMcpClients } from "./index.js";

describe("MCP client configs", () => {
  it("generates stdio configs for every supported client without secrets", () => {
    for (const client of supportedMcpClients) {
      const config = generateMcpClientConfig({ client });
      const serialized = JSON.stringify(config);

      expect(serialized).toContain("baipiao");
      expect(serialized).toContain("mcp");
      expect(config.command).toBe("baipiao");
      expect(config.args).toEqual(["mcp"]);
      expect(serialized).not.toMatch(/api[_-]?key|token|secret|cookie/i);
    }
  });

  it("generates local-only HTTP config when port mode is requested", () => {
    const config = generateMcpClientConfig({ client: "cursor", transport: "http", port: 7331 });

    expect(config.url).toBe("http://127.0.0.1:7331/mcp");
    expect(config.localOnly).toBe(true);
    expect(JSON.stringify(config)).not.toMatch(/api[_-]?key|token|secret|cookie/i);
  });
});
