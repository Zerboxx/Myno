/**
 * P3.6 REMEDIATION PASS 1 — Adversarial Tests
 *
 * Targets the three certification blockers + the recovery finding:
 *
 * BLOCKER #22 — Deterministic security-evidence fail-closed. A
 *   security-required context with no valid security-critical evidence
 *   must HARD-FAIL activation (never a warning), and pipeline failures
 *   must not be completable silently.
 * BLOCKER #23 — Real task/source isolation. Deny-by-default at the
 *   executed path; cross-task/cross-scope/unknown access must be blocked.
 * BLOCKER #24 — No fake `get_context_evidence` retrieval. Deferred
 *   evidence is honestly represented as not currently exposed.
 * FINDING #14 — Recovery boundary deterministically invalidates the
 *   pre-recovery context; heuristics only refine target kinds.
 *
 * All tests use real production code paths (no mocks of the systems
 * under test).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import type {
  ContextEvidence,
  ContextScope,
  RuntimeContext,
  ContextSelectionStage,
} from "./types.js";
import { createEvidence } from "./evidence.js";
import { executePipeline } from "./pipeline.js";
import { getBudget } from "../intelligence/budget.js";
import {
  createReferences,
  computeDisclosureMetadata,
  renderReferences,
} from "./progressive-disclosure.js";
import {
  ContextLifecycleManager,
  ContextScopeManager,
  ContextGuard,
  ContextMetricsCollector,
  ContextIsolationManager,
  ContextActivationService,
  RecoveryContextIntegrator,
} from "./runtime/index.js";
import {
  SECURITY_COLLECTOR_IDS,
  isSecurityCollectorFailure,
  countSecurityCriticalEvidence,
} from "./runtime/security-evidence-policy.js";

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function makeEvidence(overrides: Partial<ContextEvidence> = {}): ContextEvidence {
  return createEvidence({
    kind: "observation",
    source: {
      sourceType: "agent",
      sourceId: "test",
      sourceName: "Test",
      timestamp: Date.now(),
    },
    content: { type: "text", value: "Test evidence" },
    freshness: { level: "current", producedAt: Date.now() },
    criticality: "critical",
    status: "valid",
    securityClassification: "none",
    trustLevel: "project-data",
    ...(overrides as any),
  });
}

function makeSecurityEvidence(overrides: Partial<ContextEvidence> = {}): ContextEvidence {
  return makeEvidence({
    kind: "security",
    securityClassification: "security-critical",
    ...overrides,
  });
}

function makeScope(taskId: string, state: ContextScope["lifecycleState"] = "created"): {
  manager: ContextScopeManager;
  scope: ContextScope;
} {
  const manager = new ContextScopeManager();
  const scope = manager.createScope({ taskId });
  scope.lifecycleState = state;
  return { manager, scope };
}

function makeHarness(
  scopeId: string,
  taskId: string,
  isolation?: ContextIsolationManager,
) {
  const metrics = new ContextMetricsCollector();
  const lifecycle = new ContextLifecycleManager({
    enableAudit: true,
    maxGenerations: 20,
    metricsCollector: metrics,
  });
  const guard = new ContextGuard({
    maxContextAgeMs: 30 * 60 * 1000,
    requireIntegrityHash: true,
  });
  const scopeIsolation = isolation ?? new ContextIsolationManager();
  const activation = new ContextActivationService({
    lifecycle,
    guard,
    isolation: scopeIsolation,
  });

  const manager = new ContextScopeManager();
  const scope = manager.createScope({ taskId });
  scope.scopeId = scopeId as ContextScope["scopeId"];
  lifecycle.registerScope(scope);

  return {
    metrics,
    lifecycle,
    guard,
    isolation: scopeIsolation,
    activation,
    scope,
    scopeId,
    taskId,
  };
}

function activationInput(
  harness: { scopeId: ContextScope["scopeId"]; taskId: string },
  evidence: ContextEvidence[],
  overrides: Partial<Parameters<ContextActivationService["reassembleAndValidate"]>[0]> = {},
): Parameters<ContextActivationService["reassembleAndValidate"]>[0] {
  return {
    scopeId: harness.scopeId,
    taskId: harness.taskId,
    evidence,
    stage: "planning" as ContextSelectionStage,
    taskDomain: "general",
    tokenBudget: 1_000_000,
    projectFingerprint: "proj-fp-1",
    mutationSinceRefresh: false,
    refreshReason: "initial",
    destination: "instruction",
    ...overrides,
  };
}

function asmHash(assembly: string): string {
  let hash = 0;
  for (let i = 0; i < assembly.length; i++) {
    const char = assembly.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `asm-${Math.abs(hash).toString(16)}`;
}

function makeRuntimeContext(
  scope: ContextScope,
  overrides: Partial<RuntimeContext> = {},
): RuntimeContext {
  const assembly = overrides.assembly ?? `assembly-gen${scope.generation}`;
  return {
    scope,
    snapshotId: "snap-1",
    generation: scope.generation,
    stage: "planning",
    assemblyHash: overrides.assemblyHash ?? asmHash(assembly),
    assembly,
    evidenceIds: [],
    createdAt: Date.now(),
    frozenAt: Date.now(),
    status: "active",
    securityEvidenceRequired: false,
    securityEvidencePresent: true,
    securityEvidenceExpectedCount: 0,
    ...overrides,
  };
}

/* ============================================================================
 * BLOCKER #22 — SECURITY-EVIDENCE FAIL-CLOSED
 * ========================================================================== */

describe("BLOCKER #22 — security evidence is a hard activation requirement", () => {
  it("22.1 security collector failure with no security evidence blocks activation", async () => {
    const harness = makeHarness("scope-22-1", "task-22-1");
    const result = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeEvidence()], { securityCollectionFailed: true }),
    );
    assert.equal(result.ok, false, "security-required context must not activate");
    if (result.ok) return;
    assert.ok(
      result.failure.reasons.includes("Security-critical evidence required but absent from context"),
      `expected security-evidence reason, got ${result.failure.reasons.join(",")}`,
    );
    assert.equal(harness.lifecycle.getScope(harness.scope.scopeId)!.lifecycleState, "failed");
  });

  it("22.2 validation-rejected security evidence blocks activation (no present item)", async () => {
    const harness = makeHarness("scope-22-2", "task-22-2");
    // Schema-invalid (relevance out of range) but security-classified:
    // validation rejects it → it can contribute to EXPECTED but never to PRESENT.
    const rejected = makeSecurityEvidence({ relevance: 5 as any });
    const result = await harness.activation.reassembleAndValidate(
      activationInput(harness, [rejected], { expectedSecurityCriticalCount: 1 }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(
      result.failure.reasons.includes("Security-critical evidence required but absent from context"),
    );
  });

  it("22.3 selection budget drop of the only security evidence blocks activation", async () => {
    const harness = makeHarness("scope-22-3", "task-22-3");
    const sec = makeSecurityEvidence({
      content: {
        type: "text",
        value: "Security-critical: server must validate ownership, reject forged remotes, tool risk checks.",
      },
    });
    const result = await harness.activation.reassembleAndValidate(
      activationInput(harness, [sec], { tokenBudget: 1 }),
    );
    assert.equal(result.ok, false, "budget-exceeded security drop must fail closed");
  });

  it("22.4 assembly failure on task mismatch fails the scope closed (and lifecycle throws)", async () => {
    // Activation-level: request task differs from scope task → denied.
    const harness = makeHarness("scope-22-4", "task-22-4");
    const result = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeSecurityEvidence()], { taskId: "task-OTHER" }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.failure.reasons.includes("isolation-task-mismatch"));

    // Assembly-level: direct assemble with mismatched collection task → throws.
    await assert.rejects(
      harness.lifecycle.assembleForStage({
        scopeId: harness.scope.scopeId,
        collection: {
          evidence: [makeSecurityEvidence()] as any,
          metadata: { taskId: "task-OTHER", estimatedTokens: 1 },
        },
        selection: {
          selected: [],
          dropped: [],
          deferred: [],
          totalEstimatedTokens: 0,
          tokenBudget: 1000,
          stage: "planning",
          deterministicHash: "sel-x",
          metrics: {} as any,
        },
        stage: "planning",
      }),
      /isolation violation/,
    );
  });

  it("22.5 stale-after-mutation: the previous generation cannot be reused", async () => {
    const harness = makeHarness("scope-22-5", "task-22-5");
    const evidence = [makeSecurityEvidence()];
    const gen1 = await harness.activation.reassembleAndValidate(activationInput(harness, evidence));
    assert.equal(gen1.ok, true);
    if (!gen1.ok) return;

    harness.lifecycle.invalidateScope(harness.scope.scopeId, "execution-invalidated");
    // Old generation is dead on the spot.
    assert.equal(harness.guard.validate(gen1.runtimeContext).allowed, false);

    const gen2 = await harness.activation.reassembleAndValidate(
      activationInput(harness, evidence, { mutationSinceRefresh: true, refreshReason: "execution-invalidated" }),
    );
    assert.equal(gen2.ok, true, "a fresh refresh with security evidence must activate");
    if (!gen2.ok) return;
    assert.ok(gen2.runtimeContext.generation > gen1.runtimeContext.generation);
    assert.equal(harness.guard.validate(gen2.runtimeContext).allowed, true);
  });

  it("22.6 refresh failure after mutation still blocks the model", async () => {
    const harness = makeHarness("scope-22-6", "task-22-6");
    const gen1 = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeEvidence()]),
    );
    assert.equal(gen1.ok, true);
    if (!gen1.ok) return;

    harness.lifecycle.invalidateScope(harness.scope.scopeId, "execution-invalidated");
    const gen2 = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeEvidence()], {
        mutationSinceRefresh: true,
        refreshReason: "execution-invalidated",
        securityCollectionFailed: true,
      }),
    );
    assert.equal(gen2.ok, false, "security collection failure must block the refresh");
    assert.equal(harness.lifecycle.getScope(harness.scope.scopeId)!.lifecycleState, "failed");
  });

  it("22.7 recovery without security evidence blocks the model", async () => {
    const harness = makeHarness("scope-22-7", "task-22-7");
    const gen1 = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeSecurityEvidence()]),
    );
    assert.equal(gen1.ok, true);
    if (!gen1.ok) return;

    const decision = await new RecoveryContextIntegrator().onRecoveryStart({
      scope: harness.lifecycle.getScope(harness.scope.scopeId)!,
      evidence: [makeEvidence()],
      errorMessage: "anything here",
      recoveryAction: "recover-from-step-failure",
      checkpoint: "pre-recovery",
    });
    assert.equal(decision.invalidateContext, true);

    harness.lifecycle.invalidateScope(harness.scope.scopeId, decision.invalidationReason ?? "recovery-invalidated");
    const gen2 = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeEvidence()], {
        mutationSinceRefresh: true,
        refreshReason: "recovery-invalidated",
        securityCollectionFailed: true,
      }),
    );
    assert.equal(gen2.ok, false, "recovery context without valid security evidence must block");
  });

  it("22.8 warning-only can never reach the model — guard hard-denies", () => {
    const { scope } = makeScope("task-22-8", "active");
    const guard = new ContextGuard({ maxContextAgeMs: 60_000, requireIntegrityHash: true });

    const missing = makeRuntimeContext(scope, {
      assembly: "assembly without any security marker",
      securityEvidenceRequired: true,
      securityEvidencePresent: false,
    });
    const denied = guard.validate(missing);
    assert.equal(denied.allowed, false);
    assert.ok(
      denied.reasons.includes("Security-critical evidence required but absent from context"),
      `must be a hard DENY reason, got ${denied.reasons.join(",")}`,
    );

    // Positive control: the same context WITH security evidence passes.
    const present = makeRuntimeContext(scope, {
      assembly: "[SECURITY-CRITICAL] server-side ownership validation",
      securityEvidenceRequired: true,
      securityEvidencePresent: true,
    });
    assert.equal(guard.validate(present).allowed, true);
  });

  it("22.9 pipeline records a security collector failure (never swallowed)", async () => {
    const failingSecurityCollector = {
      id: "intelligence-collector",
      description: "Security intelligence collector (simulated failure)",
      collect: async () => {
        throw new Error("simulated security intelligence failure");
      },
    };
    const schemaInvalidSecurityEvidence = {
      id: "ctx-bad-sec-1",
      kind: "security",
      source: { sourceType: "agent", sourceId: "s", sourceName: "S", timestamp: 0 },
      content: { type: "text", value: "bad" },
      relevance: 5 as any,
      confidence: "unknown",
      freshness: { level: "current", producedAt: 0 },
      criticality: "critical",
      priority: "high",
      tokenEstimate: 10,
      deduplicationKey: "k-bad",
      status: "valid",
      securityClassification: "security-critical",
      trustLevel: "project-data",
      createdAt: 0,
      updatedAt: 0,
      provenance: { derivedFrom: [], steps: ["x"] },
      tags: [],
      schemaVersion: 1,
    } as unknown as ContextEvidence;

    const result = await executePipeline(
      {
        taskId: "task-22-9",
        taskDescription: "pipe",
        intent: "build",
        domain: "general",
        intelligence: null,
        budget: getBudget("standard"),
      },
      {
        collectors: [failingSecurityCollector],
      },
    );
    assert.equal(result.metrics.securityCollectionFailed, true);
    assert.equal(isSecurityCollectorFailure("intelligence-collector"), true);
    assert.ok(SECURITY_COLLECTOR_IDS.has("intelligence-collector"));

    const result2 = await executePipeline(
      {
        taskId: "task-22-9b",
        taskDescription: "pipe2",
        intent: "build",
        domain: "general",
        intelligence: null,
        budget: getBudget("standard"),
      },
      {
        collectors: [{
          id: "test-collector",
          description: "emits a schema-invalid security item",
          collect: async () => ({
            evidence: [schemaInvalidSecurityEvidence],
            collectorId: "test-collector",
            durationMs: 0,
            success: true,
            itemCount: 1,
          }),
        }],
      },
    );
    assert.equal(result2.metrics.invalidSecurityCriticalCount, 1);
    assert.equal(result2.metrics.expectedSecurityCriticalCount, 0);
  });

  it("22.10 valid security evidence satisfies the gate (positive control)", async () => {
    const harness = makeHarness("scope-22-10", "task-22-10");
    const result = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeSecurityEvidence()]),
    );
    assert.equal(result.ok, true, "a security-required context WITH evidence must activate");
    if (!result.ok) return;
    assert.equal(result.runtimeContext.securityEvidenceRequired, true);
    assert.equal(result.runtimeContext.securityEvidencePresent, true);
    assert.equal(harness.guard.validate(result.runtimeContext).allowed, true);
  });
});

/* ============================================================================
 * BLOCKER #23 — TASK / SOURCE ISOLATION (DENY BY DEFAULT)
 * ========================================================================== */

describe("BLOCKER #23 — isolation is deny-by-default at the executed path", () => {
  it("23.1 Task A cannot read Task B evidence", () => {
    const iso = new ContextIsolationManager();
    iso.registerScope("task-a", "scope-a-1");
    iso.registerEvidence("scope-a-1", ["ev-a-1"]);
    iso.registerScope("task-b", "scope-b-1");
    iso.registerEvidence("scope-b-1", ["ev-b-1"]);

    const cross = iso.canAccessEvidence({
      sourceScopeId: "scope-b-1",
      targetScopeId: "scope-a-1",
      evidenceId: "ev-a-1",
      accessType: "read",
    });
    assert.equal(cross.allowed, false);
    assert.equal(cross.reason, "cross-task access denied");
    const reverse = iso.canAccessEvidence({
      sourceScopeId: "scope-a-1",
      targetScopeId: "scope-b-1",
      evidenceId: "ev-b-1",
      accessType: "read",
    });
    assert.equal(reverse.allowed, false);
  });

  it("23.2 different source scope (same task, concurrent scopes) denied", () => {
    const iso = new ContextIsolationManager();
    iso.registerScope("task-t", "scope-t-1");
    iso.registerScope("task-t", "scope-t-2");
    iso.registerEvidence("scope-t-1", ["ev-t-1"]);
    iso.registerEvidence("scope-t-2", ["ev-t-2"]);

    const result = iso.canAccessEvidence({
      sourceScopeId: "scope-t-1",
      targetScopeId: "scope-t-2",
      evidenceId: "ev-t-2",
      accessType: "read",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "cross-scope access denied");
  });

  it("23.3 missing task binding denied (never-registered scopes)", () => {
    const iso = new ContextIsolationManager();
    const result = iso.canAccessEvidence({
      sourceScopeId: "scope-nobody-1",
      targetScopeId: "scope-nobody-1",
      evidenceId: "ev-nobody",
      accessType: "read",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "scope not bound to a task");
  });

  it("23.4 missing source (target bound, source unbound) denied", () => {
    const iso = new ContextIsolationManager();
    iso.registerScope("task-t", "scope-t-1");
    iso.registerEvidence("scope-t-1", ["ev-t-1"]);
    const result = iso.canAccessEvidence({
      sourceScopeId: "scope-unbound",
      targetScopeId: "scope-t-1",
      evidenceId: "ev-t-1",
      accessType: "read",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "scope not bound to a task");
  });

  it("23.5 unknown target scope denied", () => {
    const iso = new ContextIsolationManager();
    iso.registerScope("task-t", "scope-t-1");
    iso.registerEvidence("scope-t-1", ["ev-t-1"]);
    const result = iso.canAccessEvidence({
      sourceScopeId: "scope-t-1",
      targetScopeId: "scope-truly-unknown",
      evidenceId: "ev-t-1",
      accessType: "read",
    });
    assert.equal(result.allowed, false);
  });

  it("23.6 expired (invalidated) scope cannot keep serving context", async () => {
    const harness = makeHarness("scope-23-6", "task-23-6");
    const gen1 = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeEvidence()]),
    );
    assert.equal(gen1.ok, true);
    if (!gen1.ok) return;
    harness.lifecycle.invalidateScope(harness.scope.scopeId, "execution-invalidated");
    assert.equal(harness.guard.validate(gen1.runtimeContext).allowed, false);
    // The isolation layer refuses a cross-scope read even of evidence that
    // WAS registered to the harness scope: ownership is binding.
    const stale = harness.isolation.canAccessEvidence({
      sourceScopeId: "scope-23-6-other",
      targetScopeId: harness.scope.scopeId,
      evidenceId: gen1.runtimeContext.evidenceIds[0] ?? "missing",
      accessType: "read",
    });
    assert.equal(stale.allowed, false);
  });

  it("23.7 old generation cannot reuse the previous generation's evidence", () => {
    const iso = new ContextIsolationManager();
    iso.registerScope("task-a", "scope-gen-old");
    iso.registerEvidence("scope-gen-old", ["ev-old"]);
    const attempt = iso.verifyEvidenceAccess({
      taskId: "task-a",
      scopeId: "scope-gen-new",
      evidenceIds: ["ev-old"],
    });
    assert.equal(attempt.allowed, false);
    assert.ok(attempt.reasons.some(r => r.startsWith("evidence-owned-by-other-scope")));
  });

  it("23.8 memory recall cannot bypass isolation", () => {
    const iso = new ContextIsolationManager();
    iso.registerScope("task-a", "scope-a");
    iso.registerEvidence("scope-a", ["ev-secret"]);
    iso.registerScope("task-b", "scope-b");
    iso.registerEvidence("scope-b", ["ev-other"]);
    // A recalled string that "looks like" the other task's summary is NOT an
    // evidence id and grants nothing.
    const recall = iso.canAccessEvidence({
      sourceScopeId: "scope-b",
      targetScopeId: "scope-b",
      evidenceId: "recall-snapshot-of-task-a-summary",
      accessType: "read",
    });
    assert.equal(recall.allowed, false);
    assert.equal(iso.verifyTaskIsolation("task-a", "task-b"), true);
  });

  it("23.9 reused evidenceId across scopes fails the executed gate", async () => {
    const iso = new ContextIsolationManager();
    const hA = makeHarness("scope-a-23-9", "task-a-23-9", iso);
    const hB = makeHarness("scope-b-23-9", "task-b-23-9", iso);

    const evA = makeSecurityEvidence();
    const rA = await hA.activation.reassembleAndValidate(activationInput(hA, [evA]));
    assert.equal(rA.ok, true);
    if (!rA.ok) return;

    const rB = await hB.activation.reassembleAndValidate(
      activationInput(hB, [evA, makeEvidence()]),
    );
    assert.equal(rB.ok, false, "evidence owned by another scope must block activation");
    if (rB.ok) return;
    assert.ok(rB.failure.reasons.some(r => r.startsWith("evidence-owned-by-other-scope")));
  });

  it("23.10 concurrent scopes cannot cross-read through activation", async () => {
    const iso = new ContextIsolationManager();
    const h1 = makeHarness("scope-1-23-10", "task-23-10", iso);
    const h2 = makeHarness("scope-2-23-10", "task-23-10", iso);
    const ev1 = makeEvidence();
    const ev2 = makeEvidence();
    const r1 = await h1.activation.reassembleAndValidate(activationInput(h1, [ev1]));
    assert.equal(r1.ok, true);
    if (!r1.ok) return;
    // Same-task second scope attempts to reuse scope-1's evidence.
    const r2 = await h2.activation.reassembleAndValidate(
      activationInput(h2, [ev2, ev1]),
    );
    assert.equal(r2.ok, false);
  });

  it("23.11 isolation failure reaches the activation/model-call gate", async () => {
    const harness = makeHarness("scope-23-11", "task-23-11");
    const result = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeEvidence()], { taskId: "task-INTRUDER" }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.failure.reasons.includes("isolation-task-mismatch"));
    assert.equal(harness.lifecycle.getScope(harness.scope.scopeId)!.lifecycleState, "failed");
  });

  it("23.12 no bypass by direct evidence construction", async () => {
    const iso = new ContextIsolationManager();
    iso.registerScope("task-a", "scope-a");
    iso.registerEvidence("scope-a", ["ev-owned-a"]);
    // A forged evidence object claiming the owned id still fails the gate.
    const forged: ContextEvidence = {
      ...makeEvidence(),
      id: "ev-owned-a",
    };
    const attempt = iso.verifyEvidenceAccess({
      taskId: "task-b",
      scopeId: "scope-forged",
      evidenceIds: [forged.id],
    });
    assert.equal(attempt.allowed, false);
    assert.ok(attempt.reasons.some(r => r.startsWith("evidence-owned-by-other-scope")));
  });

  it("23.13 no cross-task evidence overlap can be created through the executed path", () => {
    const iso = new ContextIsolationManager();
    iso.registerScope("task-a", "scope-a");
    iso.registerEvidence("scope-a", ["ev-a", "ev-a2"]);
    iso.registerScope("task-b", "scope-b");
    iso.registerEvidence("scope-b", ["ev-b"]);
    assert.equal(iso.verifyTaskIsolation("task-a", "task-b"), true);
    // A cross-task reuse attempt is denied and creates NO overlap.
    const attempt = iso.verifyEvidenceAccess({
      taskId: "task-b",
      scopeId: "scope-b",
      evidenceIds: ["ev-a"],
    });
    assert.equal(attempt.allowed, false);
    assert.equal(iso.verifyTaskIsolation("task-a", "task-b"), true);
  });

  it("23.14 registerScope refuses cross-task rebinding", () => {
    const iso = new ContextIsolationManager();
    iso.registerScope("task-a", "scope-single");
    assert.throws(() => iso.registerScope("task-b", "scope-single"), /already bound to task/);
    const gate = iso.verifyEvidenceAccess({
      taskId: "task-b",
      scopeId: "scope-single",
      evidenceIds: [],
    });
    assert.equal(gate.allowed, false);
    assert.deepEqual(gate.reasons, ["scope-bound-to-different-task"]);
  });
});

/* ============================================================================
 * BLOCKER #24 — NO FAKE get_context_evidence RETRIEVAL
 * ========================================================================== */

describe("BLOCKER #24 — deferred evidence is honestly not-currently-exposed", () => {
  it("24.1 security-critical deferred references never advertise a tool", () => {
    const sec = makeSecurityEvidence({
      content: { type: "text", value: "server-side authority" },
    });
    const refs = createReferences([sec], [sec.id], "planning");
    assert.equal(refs.length, 1);
    assert.equal(refs[0].availability, "deferred-not-currently-exposed");
    assert.ok(!refs[0].retrievalHint.includes("get_context_evidence"));
    assert.ok(!refs[0].retrievalHint.includes("Use '"));
  });

  it("24.2 every deferral mechanism resolves to not-currently-exposed", () => {
    const sec = makeSecurityEvidence();
    const crit = makeEvidence({ criticality: "critical", content: { type: "text", value: "critical" } });
    const lesson = makeEvidence({ kind: "lesson", content: { type: "text", value: "lesson" } });
    const obs = makeEvidence({ kind: "observation", content: { type: "text", value: "obs" } });
    const all = [sec, crit, lesson, obs];
    const refs = createReferences(all, all.map(e => e.id), "planning");
    assert.equal(refs.length, 4);
    for (const ref of refs) {
      assert.equal(ref.availability, "deferred-not-currently-exposed");
    }
  });

  it("24.3 every retrieval hint honestly states re-collection is required", () => {
    const sec = makeSecurityEvidence();
    const refs = createReferences([sec], [sec.id], "planning");
    for (const ref of refs) {
      assert.ok(
        ref.retrievalHint.includes("context collection") || ref.retrievalHint.includes("not currently"),
        `honest availability required, got: ${ref.retrievalHint}`,
      );
    }
  });

  it("24.4 rendered references contain no tool invocation", () => {
    const sec = makeSecurityEvidence();
    const refs = createReferences([sec], [sec.id], "planning");
    const rendered = renderReferences(refs, { includeRetrievalHint: true, groupByAvailability: true });
    assert.ok(!rendered.includes("get_context_evidence"));
    assert.ok(!rendered.includes("Use '"));
    assert.ok(!rendered.includes("DEFERRED - RETRIEVABLE"));
  });

  it("24.5 disclosure metadata reports zero retrievable references", () => {
    const sec = makeSecurityEvidence();
    const obs = makeEvidence();
    const all = [sec, obs];
    const refs = createReferences(all, all.map(e => e.id), "planning");
    const meta = computeDisclosureMetadata(refs);
    assert.equal(meta.retrievableCount, 0);
    assert.equal(meta.notRetrievableCount, refs.length);
  });

  it("24.6 serialized reference surface is free of fake retrieval terms", () => {
    const sec = makeSecurityEvidence();
    const refs = createReferences([sec], [sec.id], "planning");
    const serialized = JSON.stringify(refs);
    assert.ok(!serialized.includes("get_context_evidence"));
    assert.ok(!serialized.includes("deferred-but-retrievable"));
    assert.ok(!serialized.includes("available-now"));
  });

  it("24.7 the fake retrieval tool name is absent from the registry and disclosure source", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const registryPath = join(here, "..", "..", "tools", "registry.ts");
    const disclosurePath = join(here, "progressive-disclosure.ts");
    for (const path of [registryPath, disclosurePath]) {
      const source = readFileSync(path, "utf8");
      assert.ok(!source.includes("get_context_evidence"), `${path} must not reference the fake tool`);
    }
  });
});

/* ============================================================================
 * FINDING #14 — RECOVERY DETERMINISTIC INVALIDATION
 * ========================================================================== */

describe("FINDING #14 — recovery boundary deterministically invalidates context", () => {
  it("14.1 recovery ALWAYS invalidates, regardless of input", async () => {
    const harness = makeHarness("scope-14-1", "task-14-1");
    const decision = await new RecoveryContextIntegrator().onRecoveryStart({
      scope: harness.scope,
      evidence: [makeEvidence()],
      errorMessage: "some runtime failure",
      recoveryAction: "recover-from-step-failure",
      checkpoint: "pre-recovery",
    });
    assert.equal(decision.invalidateContext, true);
  });

  it("14.2 an absent heuristic still invalidates (never heuristic-only survival)", async () => {
    const harness = makeHarness("scope-14-2", "task-14-2");
    const decision = await new RecoveryContextIntegrator().onRecoveryStart({
      scope: harness.scope,
      evidence: [],
      errorMessage: "nothing useful matched here",
      recoveryAction: "inspect-further",
      checkpoint: "pre-recovery",
    });
    assert.equal(decision.invalidateContext, true);
    assert.equal(decision.invalidationReason, "recovery-invalidated");
  });

  it("14.3 a recognized heuristic still invalidates with its specific reason", async () => {
    const harness = makeHarness("scope-14-3", "task-14-3");
    const sec = makeSecurityEvidence();
    const decision = await new RecoveryContextIntegrator().onRecoveryStart({
      scope: harness.scope,
      evidence: [sec],
      errorMessage: "Authorization failed for remote call",
      recoveryAction: "recover-from-step-failure",
      checkpoint: "pre-recovery",
    });
    assert.equal(decision.invalidateContext, true);
    assert.equal(decision.invalidationReason, "security-critical-change");
  });

  it("14.4 old generation is dead the moment recovery invalidates", async () => {
    const harness = makeHarness("scope-14-4", "task-14-4");
    const gen1 = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeSecurityEvidence()]),
    );
    assert.equal(gen1.ok, true);
    if (!gen1.ok) return;
    harness.lifecycle.invalidateScope(harness.scope.scopeId, "recovery-invalidated");
    assert.equal(harness.guard.validate(gen1.runtimeContext).allowed, false);
  });

  it("14.5 a failed refresh after recovery cannot reuse the old context", async () => {
    const harness = makeHarness("scope-14-5", "task-14-5");
    const gen1 = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeSecurityEvidence()]),
    );
    assert.equal(gen1.ok, true);
    if (!gen1.ok) return;
    harness.lifecycle.invalidateScope(harness.scope.scopeId, "recovery-invalidated");
    const gen2 = await harness.activation.reassembleAndValidate(
      activationInput(harness, [makeEvidence()], {
        mutationSinceRefresh: true,
        refreshReason: "recovery-invalidated",
        securityCollectionFailed: true,
      }),
    );
    assert.equal(gen2.ok, false);
    assert.equal(harness.lifecycle.getScope(harness.scope.scopeId)!.lifecycleState, "failed");
    assert.equal(harness.lifecycle.getRuntimeContext(harness.scope.scopeId), undefined);
  });

  it("14.6 security remains required after recovery when the policy demands it", async () => {
    const harness = makeHarness("scope-14-6", "task-14-6");
    const decision = await new RecoveryContextIntegrator().onRecoveryStart({
      scope: harness.scope,
      evidence: [],
      errorMessage: "generic",
      recoveryAction: "x",
      checkpoint: "pre-recovery",
    });
    harness.lifecycle.invalidateScope(harness.scope.scopeId, decision.invalidationReason ?? "recovery-invalidated");
    const refresh = await harness.activation.reassembleAndValidate(
      activationInput(harness, [], {
        mutationSinceRefresh: true,
        refreshReason: "recovery-invalidated",
        expectedSecurityCriticalCount: 1,
      }),
    );
    assert.equal(refresh.ok, false);
  });

  it("14.7 retry produces a NEW assembly, never a resurrection", async () => {
    const harness = makeHarness("scope-14-7", "task-14-7");
    const evidence = [makeSecurityEvidence()];
    const gen1 = await harness.activation.reassembleAndValidate(activationInput(harness, evidence));
    assert.equal(gen1.ok, true);
    if (!gen1.ok) return;

    const decision = await new RecoveryContextIntegrator().onRecoveryStart({
      scope: harness.lifecycle.getScope(harness.scope.scopeId)!,
      evidence,
      errorMessage: "boom",
      recoveryAction: "recover-from-step-failure",
      checkpoint: "pre-recovery",
    });
    harness.lifecycle.invalidateScope(harness.scope.scopeId, decision.invalidationReason ?? "recovery-invalidated");

    const gen2 = await harness.activation.reassembleAndValidate(
      activationInput(harness, evidence, {
        mutationSinceRefresh: true,
        refreshReason: "recovery-invalidated",
      }),
    );
    assert.equal(gen2.ok, true);
    if (!gen2.ok) return;
    assert.ok(gen2.runtimeContext.generation > gen1.runtimeContext.generation);
    assert.notEqual(gen2.runtimeContext.assembly, gen1.runtimeContext.assembly);
    assert.equal(harness.guard.validate(gen2.runtimeContext).allowed, true);
  });

  it("14.8 multiple recovery cycles keep producing fresh generations", async () => {
    const harness = makeHarness("scope-14-8", "task-14-8");
    const evidence = [makeSecurityEvidence()];
    const integrator = new RecoveryContextIntegrator();

    let lastGeneration = 0;
    for (let cycle = 0; cycle < 3; cycle++) {
      const decision = await integrator.onRecoveryStart({
        scope: harness.lifecycle.getScope(harness.scope.scopeId)!,
        evidence,
        errorMessage: `cycle ${cycle}`,
        recoveryAction: "recover-from-step-failure",
        checkpoint: "pre-recovery",
      });
      assert.equal(decision.invalidateContext, true);
      harness.lifecycle.invalidateScope(harness.scope.scopeId, decision.invalidationReason ?? "recovery-invalidated");
      const refresh = await harness.activation.reassembleAndValidate(
        activationInput(harness, evidence, {
          mutationSinceRefresh: true,
          refreshReason: "recovery-invalidated",
        }),
      );
      assert.equal(refresh.ok, true);
      if (!refresh.ok) return;
      assert.ok(
        refresh.runtimeContext.generation > lastGeneration,
        "each recovery cycle must produce a strictly newer generation",
      );
      lastGeneration = refresh.runtimeContext.generation;
    }
  });
});

/* ============================================================================
 * SUPPORTING POLICY ASSERTIONS
 * ========================================================================== */

describe("security-evidence-policy — deterministic counting", () => {
  it("counts valid security-critical items and ignores non-security items", () => {
    const sec = makeSecurityEvidence();
    const nonSec = makeEvidence();
    assert.equal(countSecurityCriticalEvidence([sec, nonSec]), 1);
    assert.equal(countSecurityCriticalEvidence([nonSec]), 0);
  });

  it("declares security collectors explicitly", () => {
    assert.ok(SECURITY_COLLECTOR_IDS.has("intelligence-collector"));
    assert.equal(isSecurityCollectorFailure("intelligence-collector"), true);
    assert.equal(isSecurityCollectorFailure("task-collector"), false);
  });
});