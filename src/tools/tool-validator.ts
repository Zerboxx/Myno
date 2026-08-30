import type { ToolRegistry } from "./registry.js";
import type { ToolFailureCategory, ToolResult } from "./types.js";
import {
  correctToolArguments,
  jsonSchemaSummary,
  type JsonSchemaLike,
} from "../agent/schema-correction.js";

export interface StructuredValidationError extends ToolResult {
  success: false;
  errorType: "VALIDATION" | "MISSING_PREREQUISITE";
  tool: string;
  message: string;
  expectedSchema: Record<string, string>;
  receivedArguments: unknown;
  suggestedCorrection?: Record<string, unknown>;
}

export function parseToolArguments(
  input: unknown,
): Record<string, unknown> {
  if (!input) {
    return {};
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  if (typeof input === "object" && !Array.isArray(input)) {
    return { ...(input as Record<string, unknown>) };
  }

  return {};
}

export function prepareToolArguments(
  registry: ToolRegistry,
  toolName: string,
  rawInput: unknown,
): {
  args: Record<string, unknown>;
  schema: JsonSchemaLike | undefined;
  correction: ReturnType<typeof correctToolArguments>;
  validationError?: StructuredValidationError;
} {
  const args = parseToolArguments(rawInput);
  const jsonSchema = registry.getJSONSchema(toolName) as JsonSchemaLike | undefined;
  const correction = correctToolArguments(args, jsonSchema);
  const expectedSchema = jsonSchemaSummary(jsonSchema);

  if (correction.missingRequired.length > 0) {
    return {
      args: correction.corrected,
      schema: jsonSchema,
      correction,
      validationError: {
        success: false,
        errorType:
          correction.missingRequired.includes("studio_id")
            ? "MISSING_PREREQUISITE"
            : "VALIDATION",
        tool: toolName,
        error: `Missing required parameter(s): ${correction.missingRequired.join(", ")}`,
        message: `Missing required parameter(s): ${correction.missingRequired.join(", ")}`,
        expectedSchema,
        receivedArguments: args,
        suggestedCorrection:
          Object.keys(correction.suggestedCorrection).length > 0
            ? correction.suggestedCorrection
            : suggestFromUnknown(jsonSchema, args, correction.missingRequired),
      },
    };
  }

  return {
    args: correction.corrected,
    schema: jsonSchema,
    correction,
  };
}

export function toStructuredToolError(
  toolName: string,
  errorType: ToolFailureCategory,
  message: string,
  extra?: Partial<ToolResult>,
): ToolResult {
  return {
    success: false,
    errorType,
    tool: toolName,
    error: message,
    ...extra,
  };
}

function suggestFromUnknown(
  schema: JsonSchemaLike | undefined,
  args: Record<string, unknown>,
  missingRequired: string[],
): Record<string, unknown> | undefined {
  const suggestion: Record<string, unknown> = {};

  for (const key of missingRequired) {
    if (key === "is_start" && typeof args.action === "string") {
      const action = args.action.toLowerCase();
      if (action === "start" || action === "play") {
        suggestion.is_start = true;
      } else if (action === "stop") {
        suggestion.is_start = false;
      }
    }
  }

  return Object.keys(suggestion).length > 0 ? suggestion : undefined;
}