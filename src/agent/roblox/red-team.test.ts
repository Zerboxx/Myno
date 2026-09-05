import { test } from "node:test";
import assert from "node:assert/strict";

import { runRedTeam, SECURITY_VECTORS, validateRegistry } from "./red-team.js";

test("PHASE16: red-team vectors are all defined and PASS (reproduce/classify/fix/regression)", () => {
  assert.ok(SECURITY_VECTORS.length === 12, `expected exactly 12 vectors, got ${SECURITY_VECTORS.length}`);

  const results = runRedTeam();

  for (const vector of results) {
    assert.equal(
      vector.pass,
      true,
      `VECTOR ${vector.id} [${vector.title}] FAILED\n  attack: ${vector.attack}\n  defense: ${vector.defense}\n  evidence: ${vector.evidence ?? "n/a"}`,
    );
  }
});

test("PHASE16: every vector exposes attack + defense + evidence for the audit trail", () => {
  for (const vector of SECURITY_VECTORS) {
    assert.ok(vector.attack.length > 0, `${vector.id} missing attack`);
    assert.ok(vector.defense.length > 0, `${vector.id} missing defense`);
    const result = vector.run();
    assert.ok(result.evidence.length > 0, `${vector.id} missing evidence`);
  }
});

test("PHASE16: canonical registry passes integrity validation", () => {
  const validation = validateRegistry();
  assert.equal(validation.valid, true, `Registry validation failed: ${validation.errors.join("; ")}`);
});