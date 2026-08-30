import { z } from "zod";

import type { ToolDefinition } from "../types.js";
import type { RobloxMCPClient } from "./mcp-client.js";

function mcpSchemaToZod(
  schema: unknown,
  options?: { optionalStudioId?: boolean },
): z.ZodType {
  if (
    !schema ||
    typeof schema !== "object"
  ) {
    return z.record(
      z.string(),
      z.unknown(),
    );
  }

  const objectSchema =
    schema as {
      type?: string;
      properties?: Record<
        string,
        unknown
      >;
      required?: string[];
    };

  if (
    objectSchema.type !== "object" ||
    !objectSchema.properties
  ) {
    return z.record(
      z.string(),
      z.unknown(),
    );
  }

  const shape: Record<
    string,
    z.ZodType
  > = {};

  for (
    const [
      key,
      property,
    ] of Object.entries(
      objectSchema.properties,
    )
  ) {
    shape[key] =
      jsonSchemaPropertyToZod(
        property,
      );
  }

  const required =
    new Set(
      objectSchema.required ?? [],
    );

  for (
    const key of Object.keys(shape)
  ) {
    const isStudioId = /^(studio_?id)$/i.test(key);

    if (
      !required.has(key) ||
      (options?.optionalStudioId && isStudioId)
    ) {
      shape[key] =
        shape[key].optional();
    }
  }

  return z.object(shape);
}

function jsonSchemaPropertyToZod(
  schema: unknown,
): z.ZodType {
  if (
    !schema ||
    typeof schema !== "object"
  ) {
    return z.unknown();
  }

  const property =
    schema as {
      type?: string;
      enum?: unknown[];
      description?: string;
    };

  if (
    Array.isArray(property.enum) &&
    property.enum.length > 0
  ) {
    return z
      .enum(
        property.enum as [
          string,
          ...string[],
        ],
      )
      .describe(
        property.description ?? "",
      );
  }

  switch (property.type) {
    case "string":
      return z
        .string()
        .describe(
          property.description ?? "",
        );

    case "number":
      return z
        .number()
        .describe(
          property.description ?? "",
        );

    case "integer":
      return z
        .number()
        .int()
        .describe(
          property.description ?? "",
        );

    case "boolean":
      return z
        .boolean()
        .describe(
          property.description ?? "",
        );

    case "array":
      return z
        .array(z.unknown())
        .describe(
          property.description ?? "",
        );

    case "object":
      return z
        .record(
          z.string(),
          z.unknown(),
        )
        .describe(
          property.description ?? "",
        );

    default:
      return z.unknown();
  }
}

function unwrapMcpResult(result: {
  content?: unknown;
  structuredContent?: unknown;
}): unknown {
  if (result.structuredContent !== undefined) {
    return result.structuredContent;
  }

  const content = result.content;

  if (Array.isArray(content)) {
    const texts: string[] = [];

    for (const item of content) {
      if (typeof item === "string") {
        texts.push(item);
        continue;
      }

      if (
        item &&
        typeof item === "object" &&
        typeof (item as { text?: unknown }).text === "string"
      ) {
        texts.push((item as { text: string }).text);
      }
    }

    if (texts.length === 1) {
      const text = texts[0].trim();
      const parsed = tryParseLooseJson(text);

      if (parsed !== undefined) {
        return parsed;
      }

      return texts[0];
    }

    if (texts.length > 1) {
      return texts;
    }
  }

  return result.content ?? result;
}

function createMCPTool(
  client: RobloxMCPClient,
  mcpTool: {
    name: string;
    description?: string;
    inputSchema?: Record<
      string,
      unknown
    >;
  },
): ToolDefinition {
  const registeredName = `roblox_${mcpTool.name}`;
  const inputSchema =
    mcpSchemaToZod(
      mcpTool.inputSchema,
      {
        /*
         * studio_id is ALWAYS resolved and injected by the agent's
         * execution layer (see normalizeToolArguments). Declaring it
         * optional in the schema stops models from hoisting a literal
         * placeholder into a required field, which used to cause a
         * stale-session retry loop on the first call of every task.
         */
        optionalStudioId: true,
      },
    );

  return {
    name: registeredName,

    description:
      mcpTool.description ??
      `Roblox Studio MCP tool: ${mcpTool.name}`,

    inputSchema,

    async execute(
      input: unknown,
    ) {
      if (!client.isConnected()) {
        return {
          success: false,
          errorType: "STUDIO_DISCONNECTED" as const,
          error:
            "MCP_NOT_CONNECTED: Roblox Studio MCP client is not connected.",
        };
      }

      const result =
        await client.callTool(
          mcpTool.name,
          input as Record<
            string,
            unknown
          >,
        );

      if (result.isError) {
        return {
          success: false,
          errorType: "RUNTIME" as const,
          error: `TOOL_EXECUTION_ERROR: ${JSON.stringify(
            result.content,
          )}`,
        };
      }

      return {
        success: true,
        data: unwrapMcpResult(result),
      };
    },
  };
}

function tryParseLooseJson(text: string): unknown | undefined {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : trimmed).trim();

  if (
    (body.startsWith("{") && body.endsWith("}")) ||
    (body.startsWith("[") && body.endsWith("]"))
  ) {
    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export async function createRobloxMCPTools(
  client: RobloxMCPClient,
): Promise<ToolDefinition[]> {
  const tools =
    await client.listTools();

  /*
   * FIX: this function previously had a large block of
   * console.log/console.dir debugging code placed AFTER the `return`
   * statement below. Code after an unconditional return is
   * unreachable — it never ran, on any call, ever. Removed rather
   * than moved, since it was clearly leftover ad-hoc debugging output
   * (dumping the raw MCP schema for two specific tool names) rather
   * than something the running agent depends on. If that kind of
   * schema dump is still useful during development, it belongs behind
   * an explicit DEBUG flag, printed BEFORE the return.
   */
  return tools.map(
    (tool) =>
      createMCPTool(
        client,
        tool,
      ),
  );
}