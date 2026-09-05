import { z } from "zod";

import type { ToolDefinition } from "../types.js";
import type { RobloxMCPClient } from "./mcp-client.js";

/**
 * Known required fields for Roblox MCP tools.
 * These are fields that the Roblox MCP server requires but may not be marked as required in the schema.
 */
const ROBLOX_TOOL_REQUIRED_FIELDS: Record<string, string[]> = {
  inspect_instance: ["path"],
  search_game_tree: ["path"],
  script_read: ["path"],
  script_search: ["pattern"],
  script_grep: ["pattern"],
  multi_edit: ["path", "edits"],
  execute_luau: ["code"],
  get_studio_state: [],
  start_stop_play: ["action"],
  get_console_output: [],
  screen_capture: [],
  character_navigation: ["path", "target"],
  user_keyboard_input: ["key"],
  user_mouse_input: ["x", "y"],
  list_roblox_studios: [],
  // Building tools
  create_instance: ["className", "parent"],
  create_part: ["parent"],
  create_model: ["parent"],
  insert_instance: ["className", "parent"],
  insert_model: ["path"],
  insert_asset: ["assetId", "parent"],
  modify_instance: ["path", "properties"],
  update_instance: ["path", "properties"],
  set_property: ["path", "property", "value"],
  generate_procedural: ["type"],
  generate_mesh: ["meshId", "parent"],
  generate_material: ["material", "parent"],
  segment_mesh: ["path", "segments"],
  create_folder: ["name", "parent"],
  create_script: ["parent", "source"],
  create_module: ["parent", "source"],
  clone_instance: ["path", "parent"],
  duplicate_instance: ["path", "parent"],
  rename_instance: ["path", "name"],
  parent_instance: ["path", "parent"],
  move_instance: ["path", "parent"],
};

/**
 * Patches a tool's input schema to ensure required fields are marked as required.
 * This addresses the issue where the Roblox MCP server's schema may not mark all required fields.
 */
function patchToolSchema(
  schema: unknown,
  toolName: string,
): unknown {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const objectSchema = schema as {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };

  if (
    objectSchema.type !== "object" ||
    !objectSchema.properties
  ) {
    return schema;
  }

  const knownRequired = ROBLOX_TOOL_REQUIRED_FIELDS[toolName] ?? [];
  if (knownRequired.length === 0) {
    return schema;
  }

  // Merge known required fields with existing required array
  const existingRequired = new Set(objectSchema.required ?? []);
  for (const field of knownRequired) {
    if (objectSchema.properties && field in objectSchema.properties) {
      existingRequired.add(field);
    }
  }

  return {
    ...objectSchema,
    required: Array.from(existingRequired),
  };
}

function mcpSchemaToZod(
  schema: unknown,
  options?: { optionalStudioId?: boolean },
  toolName?: string,
): z.ZodType {
  // Patch the schema before converting to Zod if we know the tool name
  const patchedSchema = toolName ? patchToolSchema(schema, toolName) : schema;

  if (
    !patchedSchema ||
    typeof patchedSchema !== "object"
  ) {
    return z.record(
      z.string(),
      z.unknown(),
    );
  }

  const objectSchema =
    patchedSchema as {
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
      mcpTool.name,
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