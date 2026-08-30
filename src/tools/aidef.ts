import type { AIToolDefinition } from "../providers/provider.js";

/*
 * Tool-definition compaction for model context.
 *
 * The Roblox MCP discovery schemas carry very long prose inside
 * `description` fields (up to ~5KB per tool in practice). Those
 * descriptions are re-sent to the model on EVERY call, and for local
 * CPU inference they dominate both context budget and prompt-eval
 * latency — the measured payload for a normal inspection call was 39.6KB
 * of descriptions out of ~51KB total.
 *
 * Compact definitions only trim *text length*; the JSON schema
 * structure (types, enums, required fields, nested shapes) is preserved
 * verbatim, so argument validation and tool calling are unaffected.
 * Validation-time schemas still come from the full `getJSONSchema`.
 */

export interface CompactDescriptionsOptions {
  maxToolDescription?: number;

  maxPropertyDescription?: number;
}

export const DEFAULT_MAX_TOOL_DESCRIPTION = 400;

export const DEFAULT_MAX_PROPERTY_DESCRIPTION = 160;

function trimString(
  value: string,
  max: number,
): string {
  if (value.length <= max) {
    return value;
  }

  return (
    value.slice(0, max) +
    "…"
  );
}

function compactNode(
  node: unknown,
  depth: number,
  maxPropertyDescription: number,
): unknown {
  if (Array.isArray(node)) {
    return node.map((item) =>
      compactNode(
        item,
        depth + 1,
        maxPropertyDescription,
      ),
    );
  }

  if (
    node &&
    typeof node === "object"
  ) {
    const object =
      node as Record<
        string,
        unknown
      >;

    const result: Record<
      string,
      unknown
    > = {};

    for (
      const key of Object.keys(
        object,
      )
    ) {
      const value = object[key];

      if (
        key === "description" &&
        typeof value === "string"
      ) {
        result[key] = trimString(
          value,
          maxPropertyDescription,
        );
      } else {
        result[key] = compactNode(
          value,
          depth + 1,
          maxPropertyDescription,
        );
      }
    }

    return result;
  }

  return node;
}

export function compactAIDefinition(
  definition: AIToolDefinition,
  options: CompactDescriptionsOptions = {},
): AIToolDefinition {
  const maxToolDescription =
    options.maxToolDescription ??
    DEFAULT_MAX_TOOL_DESCRIPTION;

  const maxPropertyDescription =
    options.maxPropertyDescription ??
    DEFAULT_MAX_PROPERTY_DESCRIPTION;

  const fn = definition.function;

  return {
    type: "function",

    function: {
      name: fn.name,

      description:
        typeof fn.description ===
        "string"
          ? trimString(
              fn.description,
              maxToolDescription,
            )
          : fn.description,

      parameters:
        compactNode(
          fn.parameters,
          0,
          maxPropertyDescription,
        ) as Record<
          string,
          unknown
        >,
    },
  };
}

export function compactAIDefinitions(
  definitions: AIToolDefinition[],
  options: CompactDescriptionsOptions = {},
): AIToolDefinition[] {
  return definitions.map(
    (definition) =>
      compactAIDefinition(
        definition,
        options,
      ),
  );
}