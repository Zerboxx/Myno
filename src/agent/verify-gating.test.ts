import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { ToolRegistry } from "../tools/registry.js";
import type { ToolDefinition } from "../tools/types.js";

import {
  hasBuildEvidence,
  hasPostBuildInspection,
  isBuildEvidenceToolByName,
} from "./verify-gating.js";
import type { ToolExecutionLike } from "./verify-gating.js";

function stubTool(name: string): ToolDefinition {
  return {
    name,
    description: `stub tool used by tests: ${name}`,
    inputSchema: z.object({}),
    execute: async () => ({ success: true }),
  };
}

function makeRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  for (const name of [
    "roblox_multi_edit",
    "roblox_script_read",
    "roblox_list_roblox_studios",
    "roblox_execute_luau",
  ]) {
    registry.register(stubTool(name));
  }

  return registry;
}

function execution(
  name: string,
  success = true,
): ToolExecutionLike {
  return { name, success };
}

test("a create via roblox_multi_edit is recognized as build evidence", () => {
  const registry = makeRegistry();

  const groupResolver = (name: string) =>
    registry.getGroup(name);

  assert.equal(
    isBuildEvidenceToolByName(
      "roblox_multi_edit",
      groupResolver,
    ),
    true,
  );
  assert.equal(
    hasBuildEvidence(
      [{ name: "roblox_multi_edit", success: true }],
      groupResolver,
    ),
    true,
  );
});

/*
 * REGRESSION GUARD for the live-test bug:
 *
 * GreeterScript was created via roblox_multi_edit and then inspected,
 * yet verification reported VERIFICATION_FAILED because the tool did
 * not count as build evidence. The fix re-classified multi_edit into
 * the roblox-building group; this test pins that exact flow.
 */
test("build via multi_edit followed by inspection passes post-build gating", () => {
  const registry = makeRegistry();

  const groupResolver = (name: string) =>
    registry.getGroup(name);

  const result = hasPostBuildInspection(
    [
      execution("roblox_multi_edit"),
      execution("roblox_script_read"),
    ],
    groupResolver,
  );

  assert.equal(result, true);
});

test("a bare create with no trailing inspection still fails gating", () => {
  const registry = makeRegistry();

  const result = hasPostBuildInspection(
    [execution("roblox_multi_edit")],
    (name) => registry.getGroup(name),
  );

  assert.equal(result, false);
});

test("studio discovery tools do not satisfy post-build inspection", () => {
  const registry = makeRegistry();

  const result = hasPostBuildInspection(
    [
      execution("roblox_multi_edit"),
      execution("roblox_list_roblox_studios"),
    ],
    (name) => registry.getGroup(name),
    (name) => name.includes("list_roblox"),
  );

  assert.equal(result, false);
});

test("no successful build tool means no post-build inspection", () => {
  const registry = makeRegistry();

  const result = hasPostBuildInspection(
    [
      execution("roblox_script_read"),
      execution("roblox_list_roblox_studios"),
    ],
    (name) => registry.getGroup(name),
  );

  assert.equal(result, false);
});

test("execute_luau counts as build evidence even without group lookup", () => {
  assert.equal(
    isBuildEvidenceToolByName("roblox_execute_luau"),
    true,
  );
  assert.equal(
    hasPostBuildInspection(
      [
        execution("roblox_execute_luau"),
        execution("roblox_get_studio_state"),
      ],
      (name) =>
        name === "roblox_get_studio_state"
          ? "roblox-inspection"
          : undefined,
    ),
    true,
  );
});