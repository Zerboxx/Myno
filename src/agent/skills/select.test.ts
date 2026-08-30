import test from "node:test";
import assert from "node:assert/strict";

import { mergeSkillGroups, selectSkills } from "./select.js";
import type { SemanticRequest } from "./types.js";

function req(partial: Partial<SemanticRequest>): SemanticRequest {
  return {
    intent: "building",
    domain: "roblox",
    operation: "create",
    scope: "none",
    target: { kind: "none", label: "" },
    requiresClarification: false,
    preserveUnrelated: false,
    constraints: [],
    language: "en",
    ...partial,
  };
}

test("all Roblox create/modify/configure intents select the single roblox-build skill", () => {
  for (const operation of ["create", "modify", "configure"] as const) {
    const selection = selectSkills(
      req({
        intent: "building",
        domain: "roblox",
        operation,
      }),
    );

    assert.equal(selection.primary.id, "roblox-build");
    assert.equal(selection.confidence, 1);
  }
});

test("mixed-language Admin UI build (the AGENTS example) stays on roblox-build", () => {
  const selection = selectSkills(
    req({
      intent: "building",
      domain: "roblox",
      operation: "create",
      language: "mixed",
    }),
  );

  assert.equal(selection.primary.id, "roblox-build");
});

test("surgical visual refinement selects roblox-refinement", () => {
  const selection = selectSkills(
    req({
      intent: "refinement",
      domain: "roblox",
      operation: "refine-visual",
      scope: "visual",
      target: { kind: "typed", label: "الزرار" },
    }),
  );

  assert.equal(selection.primary.id, "roblox-refinement");
});

test("full-scope redesign selects roblox-full-refinement", () => {
  const selection = selectSkills(
    req({
      intent: "refinement",
      domain: "roblox",
      operation: "refine",
      scope: "full",
      target: { kind: "full-scope", label: "the whole experience" },
    }),
  );

  assert.equal(selection.primary.id, "roblox-full-refinement");
});

test("debug, test, inspection route to their dedicated skills", () => {
  assert.equal(
    selectSkills(req({ intent: "debugging", domain: "roblox", operation: "debug" })).primary.id,
    "roblox-debug",
  );

  assert.equal(
    selectSkills(req({ intent: "testing", domain: "roblox", operation: "test" })).primary.id,
    "roblox-test",
  );

  assert.equal(
    selectSkills(req({ intent: "inspection", domain: "roblox", operation: "inspect" })).primary.id,
    "roblox-inspection",
  );
});

test("filesystem, terminal and general dispatch", () => {
  assert.equal(
    selectSkills(req({ intent: "coding", domain: "filesystem", operation: "create" })).primary.id,
    "filesystem-ops",
  );

  assert.equal(
    selectSkills(req({ intent: "testing", domain: "terminal", operation: "test" })).primary.id,
    "terminal-ops",
  );

  assert.equal(
    selectSkills(req({ intent: "chat", domain: "general", operation: "chat" })).primary.id,
    "general-chat",
  );
});

test("selection is deterministic", () => {
  const request = req({
    intent: "refinement",
    domain: "roblox",
    operation: "refine-behavior",
    scope: "behavior",
    target: { kind: "contextual", label: "the referenced artifact" },
    requiresClarification: true,
  });

  assert.deepEqual(selectSkills(request), selectSkills(request));
});

test("mergeSkillGroups adds required groups and keeps optional execution out when base lacks it", () => {
  const selection = selectSkills(
    req({
      intent: "refinement",
      domain: "roblox",
      operation: "refine-visual",
      scope: "visual",
      target: { kind: "typed", label: "the button" },
    }),
  );

  const merged = mergeSkillGroups(selection, ["roblox-inspection"], "roblox");

  assert.ok(merged.includes("roblox-inspection"));
  assert.ok(merged.includes("roblox-building"));
  assert.ok(!merged.includes("roblox-execution"));
});

test("language never influences selection", () => {
  const ar = selectSkills(
    req({
      intent: "refinement",
      domain: "roblox",
      operation: "refine-visual",
      scope: "visual",
      target: { kind: "typed", label: "الزرار" },
      language: "ar",
    }),
  );

  const en = selectSkills(
    req({
      intent: "refinement",
      domain: "roblox",
      operation: "refine-visual",
      scope: "visual",
      target: { kind: "typed", label: "the button" },
      language: "en",
    }),
  );

  assert.equal(ar.primary.id, en.primary.id);
  assert.equal(ar.primary.id, "roblox-refinement");
});

test("empty catalog throws instead of silently downgrading", () => {
  assert.throws(() => selectSkills(req({}), []));
});