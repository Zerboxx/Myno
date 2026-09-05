import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export function parseMcpArgs(
  raw: string | undefined,
): string[] {
  if (raw === undefined || raw === "") {
    return defaultMcpArgs();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed as string[];
    }
  } catch {
    // fall through to safe default
  }

  console.warn(
    "[mcp-client] ROBUX_MCP_ARGS is malformed or not a string array; " +
      "using the default MCP launcher arguments.",
  );

  return defaultMcpArgs();
}

function defaultMcpArgs(): string[] {
  return [
    "/c",
    "cd /d %LOCALAPPDATA%\\Roblox && .\\mcp.bat",
  ];
}

export interface RobloxMCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface RobloxMCPToolResult {
  content?: unknown;
  structuredContent?: unknown;
  isError?: boolean;
}

export class RobloxMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  private connected = false;

  async connect(): Promise<void> {
    if (this.connected && this.client) {
      return;
    }

    const command =
      process.env.ROBUX_MCP_COMMAND ??
      "cmd.exe";

    const args =
      process.env.ROBUX_MCP_ARGS
        ? JSON.parse(process.env.ROBUX_MCP_ARGS)
        : [
            "/c",
            "cd /d %LOCALAPPDATA%\\Roblox && .\\mcp.bat",
          ];

    this.client = new Client(
      {
        name: "roblox-ai-studio",
        version: "0.1.0",
      },
    );

    this.transport =
      new StdioClientTransport({
        command,
        args,
      });

    await this.client.connect(
      this.transport,
    );

    this.connected = true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async listTools(): Promise<RobloxMCPTool[]> {
    await this.ensureConnected();

    const result =
      await this.client!.listTools();

    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema:
        tool.inputSchema as Record<
          string,
          unknown
        >,
    }));
  }

  async callTool(
    name: string,
    arguments_: Record<string, unknown> = {},
  ): Promise<RobloxMCPToolResult> {
    await this.ensureConnected();

    const result =
      await this.client!.callTool({
        name,
        arguments: arguments_,
      });

    return {
  content: result.content,
  structuredContent:
    result.structuredContent,
  isError:
    result.isError === true,
};
  }

  async close(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.close();
    } finally {
      this.client = null;
      this.transport = null;
      this.connected = false;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected || !this.client) {
      await this.connect();
    }

    if (!this.connected || !this.client) {
      throw new Error(
        "MCP_NOT_CONNECTED: Roblox Studio MCP client is not connected.",
      );
    }
  }
}