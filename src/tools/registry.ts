import { z } from "zod";

import type { AIToolDefinition } from "../providers/provider.js";

import type {
  ToolContext,
  ToolDefinition,
  ToolGroup,
  ToolResult,
} from "./types.js";

import { jsonSchemaSummary } from "../agent/schema-correction.js";

export type { ToolGroup } from "./types.js";

export interface RegisteredTool {
  tool: ToolDefinition;
  group: ToolGroup;
  groupInferred: boolean;
  mutating: boolean;
  destructive: boolean;
  requiresStudioContext: boolean;
}

export interface ToolExposureOptions {
  includeDescriptions?: boolean;
  sort?: boolean;
  maxTools?: number;
}

const DESTRUCTIVE_NAME_PATTERNS = [
  "delete",
  "destroy",
  "remove",
  "wipe",
  "clear",
  "purge",
  "truncate",
  "reset",
  "shutdown",
];

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  register(tool: ToolDefinition, group?: ToolGroup): void {
    const name = tool.name.trim();

    if (!name) {
      throw new Error("Cannot register a tool without a name.");
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error(`Invalid tool name: ${name}`);
    }

    if (this.tools.has(name)) {
      throw new Error(`Tool already registered: ${name}`);
    }

    const description = tool.description?.trim();

    if (!description) {
      throw new Error(`Tool "${name}" must have a description.`);
    }

    const resolvedGroup = group ?? tool.group ?? inferToolGroup(name);
    const groupInferred = group === undefined && tool.group === undefined;

    if (groupInferred) {
      console.warn(
        `[ToolRegistry] "${name}" registered without an explicit group; ` +
          `inferred "${resolvedGroup}" from its name.`,
      );
    }

    const destructive =
      tool.destructive ?? isDestructiveName(name);

    this.tools.set(name, {
      tool: {
        ...tool,
        name,
        description,
      },
      group: resolvedGroup,
      groupInferred,
      mutating: tool.mutating ?? inferMutating(name, resolvedGroup, destructive),
      destructive,
      requiresStudioContext:
        tool.requiresStudioContext ??
        (resolvedGroup.startsWith("roblox") &&
          !isStudioDiscoveryTool(name)),
    });
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)?.tool;
  }

  getGroup(name: string): ToolGroup | undefined {
    return this.tools.get(name)?.group;
  }

  getRegistered(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  isDestructiveTool(name: string): boolean {
    return this.tools.get(name)?.destructive ?? false;
  }

  isMutatingTool(name: string): boolean {
    return this.tools.get(name)?.mutating ?? false;
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()].map((entry) => entry.tool);
  }

  listRegistered(): RegisteredTool[] {
    return [...this.tools.values()];
  }

  listByGroup(group: ToolGroup): ToolDefinition[] {
    return [...this.tools.values()]
      .filter((entry) => entry.group === group)
      .map((entry) => entry.tool);
  }

  getToolsForGroups(groups: readonly ToolGroup[]): ToolDefinition[] {
    const allowed = new Set(groups);

    return [...this.tools.values()]
      .filter((entry) => allowed.has(entry.group))
      .map((entry) => entry.tool);
  }

  getJSONSchema(name: string): Record<string, unknown> | undefined {
    const registered = this.tools.get(name);

    if (!registered) {
      return undefined;
    }

    return z.toJSONSchema(registered.tool.inputSchema) as Record<
      string,
      unknown
    >;
  }

  getAIDefinitions(
    groups?: readonly ToolGroup[],
    options: ToolExposureOptions = {},
  ): AIToolDefinition[] {
    const entries =
      groups && groups.length > 0
        ? [...this.tools.values()].filter((entry) =>
            groups.includes(entry.group),
          )
        : [...this.tools.values()];

    let selected = entries;

    if (options.sort !== false) {
      selected = [...selected].sort((a, b) =>
        a.tool.name.localeCompare(b.tool.name),
      );
    }

    if (options.maxTools !== undefined && options.maxTools > 0) {
      selected = selected.slice(0, options.maxTools);
    }

    return selected.map((entry) => ({
      type: "function" as const,
      function: {
        name: entry.tool.name,
        description:
          options.includeDescriptions === false
            ? entry.tool.name
            : entry.tool.description,
        parameters: z.toJSONSchema(entry.tool.inputSchema) as Record<
          string,
          unknown
        >,
      },
    }));
  }

  async execute(
    name: string,
    input: unknown,
    context: ToolContext,
  ): Promise<ToolResult> {
    const registered = this.tools.get(name);

    if (!registered) {
      return {
        success: false,
        errorType: "UNKNOWN",
        tool: name,
        error: `Tool not found: ${name}`,
        receivedArguments: input,
      };
    }

    const parsed = registered.tool.inputSchema.safeParse(input);

    if (!parsed.success) {
      const schema = this.getJSONSchema(name);
      const expectedSchema = jsonSchemaSummary(
        schema as {
          properties?: Record<string, { type?: string }>;
          required?: string[];
        },
      );

      return {
        success: false,
        errorType: "VALIDATION",
        tool: name,
        error: `Invalid input for ${name}: ${this.formatValidationError(parsed.error)}`,
        expectedSchema,
        receivedArguments: input,
      };
    }

    try {
      const result = await registered.tool.execute(parsed.data, context);

      if (!result || typeof result.success !== "boolean") {
        return {
          success: false,
          errorType: "RUNTIME",
          tool: name,
          error: `Tool "${name}" returned an invalid ToolResult.`,
        };
      }

      return {
        ...result,
        tool: name,
        errorType: result.success
          ? undefined
          : result.errorType ?? "RUNTIME",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        errorType: /timeout/i.test(message) ? "TIMEOUT" : "RUNTIME",
        tool: name,
        error: message,
      };
    }
  }

  private formatValidationError(error: z.ZodError): string {
    const flattened = error.flatten();

    const fieldIssues = Object.entries(flattened.fieldErrors).map(
      ([field, issues]) =>
        `${field}: ${Array.isArray(issues) ? issues.join(", ") : String(issues ?? "")}`,
    );

    const all = [...fieldIssues, ...flattened.formErrors];

    return all.length > 0 ? all.join("; ") : error.message;
  }
}

export function inferToolGroup(toolName: string): ToolGroup {
  const name = toolName.toLowerCase();

  if (
    name === "list_files" ||
    name === "read_file" ||
    name === "write_file" ||
    name === "delete_file" ||
    name.startsWith("file_") ||
    name.endsWith("_file") ||
    name.includes("filesystem")
  ) {
    return "filesystem";
  }

  if (
    name === "run_command" ||
    name.includes("command") ||
    name.includes("shell") ||
    name.includes("terminal") ||
    name.includes("powershell")
  ) {
    return "terminal";
  }

  if (name.startsWith("roblox_")) {
    if (isRobloxExecutionTool(name)) {
      return "roblox-execution";
    }

    if (isRobloxBuildingTool(name)) {
      return "roblox-building";
    }

    return "roblox-inspection";
  }

  return "general";
}

export function inferMutating(
  toolName: string,
  group: ToolGroup,
  destructive: boolean,
): boolean {
  if (destructive) {
    return true;
  }

  if (group === "roblox-building" || group === "terminal") {
    return true;
  }

  if (toolName === "write_file") {
    return true;
  }

  if (group === "roblox-execution") {
    return true;
  }

  return false;
}

export function isDestructiveName(toolName: string): boolean {
  const name = toolName.toLowerCase();

  return DESTRUCTIVE_NAME_PATTERNS.some((pattern) => name.includes(pattern));
}

export function isStudioDiscoveryTool(name: string): boolean {
  const lower = name.toLowerCase();

  return (
    lower.includes("studio") &&
    (lower.includes("list") || lower.includes("studios"))
  );
}

export function isRobloxExecutionTool(name: string): boolean {
  const patterns = [
    "start_stop_play",
    "start_play",
    "stop_play",
    "play_game",
    "run_game",
    "playtest",
    "test_game",
    "execute_luau",
    "execute_code",
    "run_luau",
    "run_script",
    "run_code",
    "restart",
    "shutdown",
    "publish",
  ];

  return patterns.some((pattern) => name.includes(pattern));
}

export function isRobloxBuildingTool(name: string): boolean {
  const patterns = [
    "create_instance",
    "create_part",
    "create_model",
    "insert_instance",
    "insert_model",
    "insert_asset",
    "modify_instance",
    "update_instance",
    "set_property",
    "generate_procedural",
    "generate_mesh",
    "generate_material",
    "segment_mesh",
    "create_folder",
    "create_script",
    "create_module",
    "clone_instance",
    "duplicate_instance",
    "rename_instance",
    "parent_instance",
    "move_instance",
    "multi_edit",
  ];

  return patterns.some((pattern) => name.includes(pattern));
}
