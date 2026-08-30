import assert from "node:assert/strict";
import test from "node:test";

import {
  looksLikePlaceholderValue,
  normalizeRobloxToolArguments,
} from "./studio-context.js";

const STUDIO_ID = "a6faa81f-9328-4239-88f0-89c8a4323a10";

test("placeholder values are recognized as missing", () => {
  assert.equal(
    looksLikePlaceholderValue("studio_id"),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue("STUDIO_ID"),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue("<studio_id>"),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue("TODO"),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue("default"),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue("your_studio_id"),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue("placeholder"),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue(""),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue("   "),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue("abc"),
    true,
  );
  assert.equal(
    looksLikePlaceholderValue("id"),
    true,
  );
});

test("real studio ids are not flagged as placeholders", () => {
  assert.equal(
    looksLikePlaceholderValue(STUDIO_ID),
    false,
  );
});

test("a literal placeholder studio_id is overwritten with the real id", () => {
  const result = normalizeRobloxToolArguments(
    { studio_id: "studio_id" },
    "studio_id",
    STUDIO_ID,
  );

  assert.equal(result.studioIdInjected, true);
  assert.equal(result.normalized.studio_id, STUDIO_ID);
});

test("an angle-bracket placeholder is overwritten", () => {
  const result = normalizeRobloxToolArguments(
    { studio_id: "<id>" },
    "studio_id",
    STUDIO_ID,
  );

  assert.equal(result.studioIdInjected, true);
  assert.equal(result.normalized.studio_id, STUDIO_ID);
});

test("a missing studio_id is injected", () => {
  const result = normalizeRobloxToolArguments(
    { path: "Workspace.X" },
    "studio_id",
    STUDIO_ID,
  );

  assert.equal(result.studioIdInjected, true);
  assert.equal(result.normalized.studio_id, STUDIO_ID);
});

test("a real provided studio_id is never overwritten", () => {
  const result = normalizeRobloxToolArguments(
    { studio_id: STUDIO_ID },
    "studio_id",
    STUDIO_ID,
  );

  assert.equal(result.studioIdInjected, false);
  assert.equal(result.normalized.studio_id, STUDIO_ID);
});

test("no resolved id means no injection", () => {
  const result = normalizeRobloxToolArguments(
    {},
    "studio_id",
    undefined,
  );

  assert.equal(result.studioIdInjected, false);
});

test("no studio_id-shaped key means no injection", () => {
  const result = normalizeRobloxToolArguments(
    { path: "Workspace.X" },
    null,
    STUDIO_ID,
  );

  assert.equal(result.studioIdInjected, false);
  assert.deepEqual(result.normalized, { path: "Workspace.X" });
});