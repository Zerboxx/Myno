import { z } from "zod";

export type ToolGroup =
  | "filesystem"
  | "terminal"
  | "roblox-inspection"
  | "roblox-execution"
  | "roblox-building"
  | "general";

export type ToolFailureCategory =
  | "VALIDATION"
  | "MISSING_PREREQUISITE"
  | "INVALID_CONTEXT"
  | "STUDIO_DISCONNECTED"
  | "RUNTIME"
  | "PERMISSION"
  | "TIMEOUT"
  | "DUPLICATE"
  | "UNKNOWN";

export interface ToolPrerequisite {
  parameter: string;
  resolver: string;
}

export interface ToolContext {
  sessionId: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: ToolFailureCategory;
  tool?: string;
  expectedSchema?: Record<string, string>;
  receivedArguments?: unknown;
  suggestedCorrection?: Record<string, unknown>;
  blocked?: string;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  group?: ToolGroup;
  mutating?: boolean;
  destructive?: boolean;
  requiresStudioContext?: boolean;
  prerequisites?: ToolPrerequisite[];
  execute(
    input: TInput,
    context: ToolContext,
  ): Promise<ToolResult<TOutput>>;
}
