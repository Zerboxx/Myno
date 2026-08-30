import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import {
  ToolRegistry,
  isRobloxBuildingTool,
  isRobloxExecutionTool,
} from "./registry.js";
import type { ToolDefinition } from "./types.js";

function stubTool(name: string): ToolDefinition {
  return {
    name,
    description: `stub tool used by tests: ${name}`,
    inputSchema: z.object({}),
    execute: async () => ({ success: true }),
  };
}

test("roblox_multi_edit is classified as a building (mutating) tool", () => {
  const registry = new ToolRegistry();

  registry.register(stubTool("roblox_multi_edit"));

  assert.equal(
    registry.getGroup("roblox_multi_edit"),
    "roblox-building",
  );
  assert.equal(
    registry.isMutatingTool("roblox_multi_edit"),
    true,
  );
  assert.equal(
    isRobloxBuildingTool("roblox_multi_edit"),
    true,
  );
});

test("read-only Roblox tools stay non-mutating inspection tools", () => {
  const registry = new ToolRegistry();

  registry.register(stubTool("roblox_script_read"));

  assert.equal(
    registry.getGroup("roblox_script_read"),
    "roblox-inspection",
  );
  assert.equal(
    registry.isMutatingTool("roblox_script_read"),
    false,
  );
  assert.equal(
    isRobloxBuildingTool("roblox_script_read"),
    false,
  );
});

test("roblox_execute_luau is classified as execution and mutating", () => {
  const registry = new ToolRegistry();

  registry.register(stubTool("roblox_execute_luau"));

  assert.equal(
    registry.getGroup("roblox_execute_luau"),
    "roblox-execution",
  );
  assert.equal(
    registry.isMutatingTool("roblox_execute_luau"),
    true,
  );
  assert.equal(
    isRobloxExecutionTool("roblox_execute_luau"),
    true,
  );
});

test("an explicit group override is respected over name inference", () => {
  const registry = new ToolRegistry();

  registry.register(
    stubTool("roblox_execute_luau"),
    "roblox-inspection",
  );

  assert.equal(
    registry.getGroup("roblox_execute_luau"),
    "roblox-inspection",
  );
});