import assert from "node:assert/strict";
import test from "node:test";

import {
  compactAIDefinition,
  compactAIDefinitions,
  DEFAULT_MAX_PROPERTY_DESCRIPTION,
  DEFAULT_MAX_TOOL_DESCRIPTION,
} from "./aidef.js";

const LONG_RUN = "x".repeat(4000);

function makeDefinition(overrides: {
  toolDescription?: string;
  propertyDescription?: string;
} = {}): Parameters<typeof compactAIDefinition>[0] {
  return {
    type: "function",
    function: {
      name: "test_tool",
      description: overrides.toolDescription ?? "short",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: overrides.propertyDescription ?? "short prop",
          },
          mode: {
            type: "string",
            enum: ["read", "write"],
            description: "choose mode",
          },
          filters: {
            type: "array",
            items: {
              type: "string",
              description: "a tag",
            },
          },
        },
        required: ["path"],
      },
    },
  };
}

test("compactAIDefinition trims only long descriptions, keeps structure", () => {
  const compacted = compactAIDefinition(
    makeDefinition({ toolDescription: LONG_RUN, propertyDescription: LONG_RUN }),
  );

  const fn = compacted.function;

  assert.ok(fn.description.length < 1000);
  assert.ok(fn.description.startsWith(LONG_RUN.slice(0, DEFAULT_MAX_TOOL_DESCRIPTION)));
  assert.ok(fn.description.endsWith("…"));

  const parameters = fn.parameters as {
    properties: Record<string, unknown>;
    required: string[];
    type: string;
  };

  assert.equal(parameters.type, "object");
  assert.deepEqual(parameters.required, ["path"]);

  const pathProp = parameters.properties.path as { type: string; description: string };
  assert.equal(pathProp.type, "string");
  assert.ok(pathProp.description.startsWith(LONG_RUN.slice(0, DEFAULT_MAX_PROPERTY_DESCRIPTION)));
  assert.ok(pathProp.description.endsWith("…"));

  const modeProp = parameters.properties.mode as { enum: string[]; description: string };
  assert.deepEqual(modeProp.enum, ["read", "write"]);
  assert.equal(modeProp.description, "choose mode");

  const filtersProp = parameters.properties.filters as {
    type: string;
    items: { description: string };
  };
  assert.equal(filtersProp.type, "array");
  assert.equal(filtersProp.items.description, "a tag");
});

test("compactAIDefinition preserves short tool description untouched", () => {
  const compacted = compactAIDefinition(
    makeDefinition({ toolDescription: "a short description" }),
  );

  assert.equal(compacted.function.description, "a short description");
});

test("compactAIDefinition honors custom maxima", () => {
  const compacted = compactAIDefinition(
    makeDefinition({ toolDescription: LONG_RUN, propertyDescription: LONG_RUN }),
    {
      maxToolDescription: 50,
      maxPropertyDescription: 20,
    },
  );

  assert.ok(compacted.function.description.length <= 53);
  const parameters = compacted.function.parameters as {
    properties: { path: { description: string } };
  };
  assert.ok(parameters.properties.path.description.length <= 23);
});

test("compactAIDefinitions maps every definition", () => {
  const definitions = [makeDefinition(), makeDefinition()];

  const compacted = compactAIDefinitions(definitions);

  assert.equal(compacted.length, 2);
  assert.equal(compacted[0].function.name, "test_tool");
  assert.equal(compacted[1].function.name, "test_tool");
});