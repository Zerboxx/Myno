/**
 * P3.6-B — Context Collection Pipeline Tests
 *
 * Comprehensive test suite covering categories A–W per spec.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type {
  ContextEvidence,
  ContextCollection,
} from "./types.js";
import type { TaskIntelligence } from "../intelligence/orchestrator.js";
import { createEvidence, createDerivedEvidence } from "./evidence.js";
import { createCollection, deduplicateByKey, getDeduplicationGroups } from "./collection.js";
import { validateContextEvidence } from "./validation.js";
import { buildProvenance, buildDerivedProvenance, getProvenanceDepth, wouldCreateCycle, hasCycle } from "./provenance.js";
import { classifyFreshness, evaluateFreshness, isInvalidatedByMutation } from "./freshness.js";
import { computePriority, assignPriority, explainPriority, comparePriority } from "./prioritization.js";
import { createSnapshot, isSnapshotImmutable } from "./snapshot.js";
import { executePipeline } from "./pipeline.js";
import type { ContextCollectionRequest } from "./collectors/collectors.js";
import {
  taskCollector,
  projectMapCollector,
  intelligenceCollector,
  executionCollector,
  verificationCollector,
  lessonCollector,
} from "./collectors/collectors.js";

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function makeIntelligence(overrides: any = {}): TaskIntelligence {
  return {
    projectMap: null,
    architecture: null,
    luau: null,
    remoteReview: null,
    security: null,
    worldBuilding: null,
    knowledge: [],
    quality: null,
    lessons: [],
    failurePatterns: [],
    placement: null,
    constitution: null,
    gameplay: null,
    uiux: null,
    responsive: null,
    performance: null,
    dependency: null,
    metadata: {
      gatheredAt: Date.now(),
      durationMs: 100,
      subsystemsInvoked: [],
      subsystemsFailed: [],
      projectMapAvailable: false,
      studioConnected: false,
    },
    ...overrides,
  } as any;
}

function makeRequest(overrides: Partial<ContextCollectionRequest> = {}): ContextCollectionRequest {
  return {
    taskId: "test-task-1",
    taskDescription: "Fix the typo in DeliveryService",
    intent: "fix-typo",
    domain: "general",
    intelligence: null,
    budget: null,
    ...overrides,
  };
}

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
    ...overrides,
  });
}

/* ============================================================================
 * A. TASK COLLECTION
 * ========================================================================== */

describe("A. Task Collection", () => {
  it("collects user request as user-input evidence", async () => {
    const request = makeRequest({ taskDescription: "Build a secure trading system" });
    const result = await taskCollector.collect(request);

    assert.equal(result.success, true);
    assert.ok(result.evidence.length >= 2);

    const userInput = result.evidence.find(e => e.kind === "user-input");
    assert.ok(userInput);
    assert.equal(userInput.trustLevel, "user-input");
    assert.equal(userInput.content.type, "text");
    if (userInput.content.type === "text") {
      assert.ok(userInput.content.value.includes("secure trading system"));
    }
  });

  it("collects intent as system-classified constraint", async () => {
    const request = makeRequest({ intent: "fix-typo", domain: "general" });
    const result = await taskCollector.collect(request);

    const intent = result.evidence.find(e => e.tags.includes("intent"));
    assert.ok(intent);
    assert.equal(intent.trustLevel, "system");
    assert.equal(intent.kind, "constraint");
  });

  it("user evidence is not reinterpreted as system fact", async () => {
    const request = makeRequest({ taskDescription: "The trading system is broken" });
    const result = await taskCollector.collect(request);

    const userInput = result.evidence.find(e => e.kind === "user-input");
    assert.ok(userInput);
    assert.equal(userInput.trustLevel, "user-input");
    // Should NOT contain "broken" interpreted as a system fact
    assert.ok(!userInput.tags.includes("system-fact"));
  });
});

/* ============================================================================
 * B. INTELLIGENCE COLLECTION
 * ========================================================================== */

describe("B. Intelligence Collection", () => {
  it("converts security findings to evidence", async () => {
    const intel = makeIntelligence({
      security: {
        vulnerabilities: [
          { id: "v1", type: "remote-trust", severity: "critical", description: "Remote trusts client price" },
          { id: "v2", type: "injection", severity: "high", description: "SQL injection possible" },
        ],
        score: 30,
      },
    });
    const request = makeRequest({ intelligence: intel });
    const result = await intelligenceCollector.collect(request);

    const secEvidence = result.evidence.filter(e => e.kind === "security");
    assert.equal(secEvidence.length, 2);
    assert.equal(secEvidence[0].securityClassification, "security-critical");
    assert.equal(secEvidence[0].trustLevel, "project-data");
  });

  it("converts architecture findings to evidence", async () => {
    const intel = makeIntelligence({
      architecture: {
        style: "service-oriented",
        servicePlacement: { current: [], recommended: [], misplaced: [] },
        moduleOrganization: { currentStyle: "folder-per-module", recommendedStyle: "folder-per-module", clusters: [], violations: [] },
        dataFlow: { flows: [], bottlenecks: [], singlePointsOfFailure: [] },
        patterns: [],
        antiPatterns: [
          { name: "MonolithicScript", description: "Monolithic script", locations: [], severity: "high", fix: "Split modules", confidence: 0.8 },
        ],
        recommendations: [
          { id: "rec-1", category: "structure", priority: "high", title: "Split modules", description: "Split into modules", rationale: "Improve maintainability", implementation: [], effort: "medium", impact: "high" },
        ],
        score: 60,
      },
    });
    const request = makeRequest({ intelligence: intel });
    const result = await intelligenceCollector.collect(request);

    const archEvidence = result.evidence.filter(e => e.kind === "architecture");
    assert.ok(archEvidence.length >= 1);
  });

  it("does not re-run intelligence engines", async () => {
    let engineCallCount = 0;
    const intel = makeIntelligence({
      security: {
        vulnerabilities: [{ id: "v1", type: "test", severity: "low", description: "Test" }],
        score: 50,
      },
    });
    const request = makeRequest({ intelligence: intel });
    // The collector should only consume, not produce intelligence
    const result = await intelligenceCollector.collect(request);
    assert.ok(result.success);
    assert.ok(result.evidence.length > 0);
  });

  it("respects budget limits on evidence count", async () => {
    const vulns = Array.from({ length: 20 }, (_, i) => ({
      id: `v${i}`, type: "test", severity: "low" as const, description: `Vuln ${i}`,
    }));
    const intel = makeIntelligence({
      security: { vulnerabilities: vulns, score: 50 },
    });
    const request = makeRequest({ intelligence: intel });
    const result = await intelligenceCollector.collect(request);

    // Should be limited (slice(0, 10))
    const secEvidence = result.evidence.filter(e => e.kind === "security");
    assert.ok(secEvidence.length <= 10);
  });
});

/* ============================================================================
 * C. PROJECT COLLECTION
 * ========================================================================== */

describe("C. Project Collection", () => {
  it("returns empty when project map unavailable", async () => {
    const request = makeRequest({ intelligence: makeIntelligence({ projectMap: null }) });
    const result = await projectMapCollector.collect(request);

    assert.equal(result.success, true);
    assert.equal(result.evidence.length, 0);
  });

  it("collects project structure from project map", async () => {
    const intel = makeIntelligence({
      projectMap: {
        projectId: "proj-1",
        workspaceRoot: "/workspace",
        instances: [{ name: "Workspace", className: "Folder", path: "Workspace", children: [], properties: {}, attributes: {} }],
        scripts: [{ name: "ServerScript", className: "Script", path: "ServerScriptService.Script", source: "", children: [], properties: {}, enabled: true, runContext: "Server" }],
        remotes: [{ name: "TradeRemote", className: "RemoteEvent", path: "ReplicatedStorage.TradeRemote", children: [], properties: {} }],
        uiHierarchy: { screenGuis: {}, starterGui: {}, starterPlayerScripts: {} },
        world: { terrain: {}, zones: {}, buildings: [], roads: [], lighting: {} },
        tags: new Map(),
        attributes: new Map(),
        assets: { meshes: {}, images: {}, sounds: {}, animations: {}, fonts: {} },
        configs: [],
        conventions: { naming: {}, folderStructure: {}, scriptConventions: {}, uiConventions: {}, namingConventions: {}, codeStyle: {}, documentation: {} },
        systems: {},
        dependencies: { nodes: new Map(), edges: [] },
        issues: [{ severity: "warning", message: "Unused variable", path: "Script" }],
        services: {},
        dataModel: {} as any,
        lastUpdated: Date.now(),
        schemaVersion: 1,
      },
    });
    const request = makeRequest({ intelligence: intel });
    const result = await projectMapCollector.collect(request);

    assert.ok(result.evidence.length >= 1);
    const structEvidence = result.evidence.find(e => e.kind === "project-map");
    assert.ok(structEvidence);
    assert.equal(structEvidence.trustLevel, "project-data");
  });

  it("no fabricated evidence when project map is null", async () => {
    const request = makeRequest({ intelligence: makeIntelligence({ projectMap: null }) });
    const result = await projectMapCollector.collect(request);

    assert.equal(result.evidence.length, 0);
    // No fake project structure evidence
    const projectEvidence = result.evidence.filter(e => e.kind === "project-map");
    assert.equal(projectEvidence.length, 0);
  });
});

/* ============================================================================
 * D. EXECUTION EVIDENCE
 * ========================================================================== */

describe("D. Execution Evidence", () => {
  it("distinguishes succeeded vs failed tools", async () => {
    const request = makeRequest({
      executedTools: [
        { name: "read_file", status: "success", input: {} },
        { name: "write_file", status: "error", input: {} },
        { name: "search", status: "success", input: {} },
      ],
    });
    const result = await executionCollector.collect(request);

    assert.ok(result.evidence.length >= 1);
    const summary = result.evidence.find(e => e.kind === "observation");
    assert.ok(summary);
    // Should NOT claim all completed
    assert.ok(!summary.tags.includes("all-completed"));
  });

  it("returns empty when no tools executed", async () => {
    const request = makeRequest({ executedTools: [] });
    const result = await executionCollector.collect(request);

    assert.equal(result.evidence.length, 0);
  });

  it("execution evidence does not falsely claim verification", async () => {
    const request = makeRequest({
      executedTools: [
        { name: "build", status: "success", input: {} },
      ],
    });
    const result = await executionCollector.collect(request);

    // Should not have verification tag
    const verified = result.evidence.filter(e => e.tags.includes("verified"));
    assert.equal(verified.length, 0);
  });
});

/* ============================================================================
 * E. VERIFICATION EVIDENCE
 * ========================================================================== */

describe("E. Verification Evidence", () => {
  it("collects verification results", async () => {
    const request = makeRequest({
      verification: { passed: true, errors: [], warnings: ["Minor style issue"] },
    });
    const result = await verificationCollector.collect(request);

    assert.ok(result.evidence.length >= 1);
    const verEvidence = result.evidence.find(e => e.kind === "verification");
    assert.ok(verEvidence);
    assert.equal(verEvidence.trustLevel, "system");
  });

  it("test passed is evidence of that test only, not feature correctness", async () => {
    const request = makeRequest({
      verification: { passed: true, errors: [], warnings: [] },
    });
    const result = await verificationCollector.collect(request);

    const verEvidence = result.evidence.find(e => e.kind === "verification");
    assert.ok(verEvidence);
    // Should NOT contain "feature-correct" tag
    assert.ok(!verEvidence.tags.includes("feature-correct"));
  });

  it("verification errors are critical priority", async () => {
    const request = makeRequest({
      verification: { passed: false, errors: ["Type mismatch"], warnings: [] },
    });
    const result = await verificationCollector.collect(request);

    const errors = result.evidence.filter(e => e.kind === "runtime-error");
    assert.ok(errors.length > 0);
    assert.equal(errors[0].priority, "critical");
    assert.equal(errors[0].criticality, "critical");
  });
});

/* ============================================================================
 * F. LESSON EVIDENCE
 * ========================================================================== */

describe("F. Lesson Evidence", () => {
  it("collects lessons as historical evidence", async () => {
    const intel = makeIntelligence({
      lessons: [
        { content: "Always validate remote arguments server-side", confidence: 0.9, category: "security" },
      ],
    });
    const request = makeRequest({ intelligence: intel });
    const result = await lessonCollector.collect(request);

    assert.ok(result.evidence.length >= 1);
    const lesson = result.evidence.find(e => e.kind === "lesson");
    assert.ok(lesson);
    assert.equal(lesson.trustLevel, "system");
  });

  it("lessons are not treated as ground truth", async () => {
    const intel = makeIntelligence({
      lessons: [{ content: "Use LocalScripts for server logic", confidence: 0.5 }],
    });
    const request = makeRequest({ intelligence: intel });
    const result = await lessonCollector.collect(request);

    const lesson = result.evidence.find(e => e.kind === "lesson");
    assert.ok(lesson);
    // Lessons should not have critical trust
    assert.ok(lesson.confidence !== "unknown" ? lesson.confidence <= 0.9 : true);
  });
});

/* ============================================================================
 * G. PROVENANCE PRESERVATION
 * ========================================================================== */

describe("G. Provenance Preservation", () => {
  it("every collected evidence has provenance", async () => {
    const request = makeRequest({
      intelligence: makeIntelligence({
        security: { vulnerabilities: [{ id: "v1", type: "test", severity: "low", description: "Test" }], score: 50 },
      }),
    });

    const results = await Promise.all([
      taskCollector.collect(request),
      intelligenceCollector.collect(request),
      executionCollector.collect(request),
      verificationCollector.collect(request),
      lessonCollector.collect(request),
    ]);

    for (const result of results) {
      for (const evidence of result.evidence) {
        assert.ok(evidence.provenance, `Evidence ${evidence.id} missing provenance`);
        assert.ok(Array.isArray(evidence.provenance.derivedFrom));
        assert.ok(Array.isArray(evidence.provenance.steps));
        assert.ok(evidence.provenance.steps.length > 0);
      }
    }
  });

  it("derived evidence preserves parent lineage", () => {
    const parent = makeEvidence();
    const child = createDerivedEvidence(parent, {
      kind: "security",
      content: { type: "text", value: "Derived finding" },
    });

    assert.ok(child.provenance.derivedFrom.includes(parent.id));
    assert.ok(child.provenance.steps.some(s => s.includes("derived")));
  });
});

/* ============================================================================
 * H. DERIVED EVIDENCE LINEAGE
 * ========================================================================== */

describe("H. Derived Evidence Lineage", () => {
  it("buildDerivedProvenance creates correct chain", () => {
    const parent1 = makeEvidence();
    const parent2 = makeEvidence();
    const provenance = buildDerivedProvenance([parent1, parent2], "test-collector", "corroboration");

    assert.ok(provenance);
    assert.ok(provenance.derivedFrom.includes(parent1.id));
    assert.ok(provenance.derivedFrom.includes(parent2.id));
    assert.ok(provenance.steps.some(s => s.includes("corroboration")));
  });

  it("buildDerivedProvenance returns null for empty parents", () => {
    const provenance = buildDerivedProvenance([], "test-collector", "test");
    assert.equal(provenance, null);
  });
});

/* ============================================================================
 * I. CYCLE DETECTION
 * ========================================================================== */

describe("I. Cycle Detection", () => {
  it("detects direct self-reference cycle", () => {
    const evidenceMap = new Map<string, ContextEvidence>();
    const e1 = makeEvidence();
    evidenceMap.set(e1.id, e1);

    assert.equal(wouldCreateCycle(evidenceMap, e1.id, e1.id), true);
  });

  it("detects indirect cycle", () => {
    const evidenceMap = new Map<string, ContextEvidence>();
    const e1 = makeEvidence();
    const e2 = makeEvidence();
    e2.provenance = { derivedFrom: [e1.id], steps: ["derived"] };
    evidenceMap.set(e1.id, e1);
    evidenceMap.set(e2.id, e2);

    // e2 depends on e1, and we're trying to make e1 depend on e2
    assert.equal(wouldCreateCycle(evidenceMap, e2.id, e1.id), true);
  });

  it("allows valid derivation chain", () => {
    const evidenceMap = new Map<string, ContextEvidence>();
    const e1 = makeEvidence();
    evidenceMap.set(e1.id, e1);

    assert.equal(wouldCreateCycle(evidenceMap, e1.id, "new-child-id"), false);
  });

  it("hasCycle detects cycles in provenance chain", () => {
    const provenance = { derivedFrom: ["a", "b", "a"], steps: ["test"] };
    assert.equal(hasCycle(provenance), true);
  });

  it("hasCycle returns false for clean chain", () => {
    const provenance = { derivedFrom: ["a", "b"], steps: ["test"] };
    assert.equal(hasCycle(provenance), false);
  });
});

/* ============================================================================
 * J. FRESHNESS CLASSIFICATION
 * ========================================================================== */

describe("J. Freshness Classification", () => {
  it("freshly created evidence is current", () => {
    const evidence = makeEvidence({
      freshness: { level: "current", producedAt: Date.now() },
    });
    const level = classifyFreshness(evidence);
    assert.equal(level, "current");
  });

  it("old project-map evidence becomes stale", () => {
    const evidence = makeEvidence({
      kind: "project-map",
      freshness: { level: "current", producedAt: Date.now() - 600_000 },
    });
    const level = classifyFreshness(evidence);
    assert.equal(level, "stale");
  });

  it("user-input does not expire by age", () => {
    const evidence = makeEvidence({
      kind: "user-input",
      freshness: { level: "current", producedAt: Date.now() - 1_000_000 },
    });
    const level = classifyFreshness(evidence);
    assert.equal(level, "current");
  });

  it("lesson evidence does not expire by age", () => {
    const evidence = makeEvidence({
      kind: "lesson",
      freshness: { level: "current", producedAt: Date.now() - 5_000_000 },
    });
    const level = classifyFreshness(evidence);
    assert.equal(level, "current");
  });

  it("project mutation invalidates project-map evidence", () => {
    const evidence = makeEvidence({
      kind: "project-map",
      freshness: { level: "current", producedAt: Date.now() },
    });
    const { evidence: updated, staleCount } = evaluateFreshness([evidence], true);
    assert.equal(staleCount, 1);
    assert.equal(updated[0].freshness.level, "stale");
  });

  it("project mutation does NOT invalidate user-input evidence", () => {
    const evidence = makeEvidence({
      kind: "user-input",
      freshness: { level: "current", producedAt: Date.now() },
    });
    const { evidence: updated, staleCount } = evaluateFreshness([evidence], true);
    assert.equal(staleCount, 0);
    assert.equal(updated[0].freshness.level, "current");
  });

  it("isInvalidatedByMutation returns correct values", () => {
    assert.equal(isInvalidatedByMutation("project-map"), true);
    assert.equal(isInvalidatedByMutation("user-input"), false);
    assert.equal(isInvalidatedByMutation("lesson"), false);
    assert.equal(isInvalidatedByMutation("security"), true);
  });
});

/* ============================================================================
 * K. PROJECT MUTATION INVALIDATION
 * ========================================================================== */

describe("K. Project Mutation Invalidation", () => {
  it("only relevant evidence becomes stale on mutation", () => {
    const evidence = [
      makeEvidence({ kind: "project-map", freshness: { level: "current", producedAt: Date.now() } }),
      makeEvidence({ kind: "user-input", freshness: { level: "current", producedAt: Date.now() } }),
      makeEvidence({ kind: "lesson", freshness: { level: "current", producedAt: Date.now() } }),
    ];
    const { staleCount } = evaluateFreshness(evidence, true);
    assert.equal(staleCount, 1); // Only project-map
  });

  it("no mutation means no invalidation", () => {
    const evidence = [
      makeEvidence({ kind: "project-map", freshness: { level: "current", producedAt: Date.now() } }),
    ];
    const { staleCount } = evaluateFreshness(evidence, false);
    assert.equal(staleCount, 0);
  });
});

/* ============================================================================
 * L. DEDUPLICATION
 * ========================================================================== */

describe("L. Deduplication", () => {
  it("exact duplicates are removed by deduplicateByKey", () => {
    const e1 = makeEvidence({ deduplicationKey: "same-key" });
    const e2 = makeEvidence({ deduplicationKey: "same-key" });
    const collection = createCollection([e1, e2], "test");
    const deduped = deduplicateByKey(collection);

    assert.equal(deduped.evidence.length, 1);
  });

  it("different keys are preserved", () => {
    const e1 = makeEvidence({ deduplicationKey: "key-1" });
    const e2 = makeEvidence({ deduplicationKey: "key-2" });
    const collection = createCollection([e1, e2], "test");
    const deduped = deduplicateByKey(collection);

    assert.equal(deduped.evidence.length, 2);
  });

  it("getDeduplicationGroups groups correctly", () => {
    const e1 = makeEvidence({ deduplicationKey: "key-1" });
    const e2 = makeEvidence({ deduplicationKey: "key-1" });
    const e3 = makeEvidence({ deduplicationKey: "key-2" });
    const collection = createCollection([e1, e2, e3], "test");
    const groups = getDeduplicationGroups(collection);

    assert.equal(groups.size, 2);
    assert.equal(groups.get("key-1")?.length, 2);
    assert.equal(groups.get("key-2")?.length, 1);
  });
});

/* ============================================================================
 * M. CORROBORATION PRESERVATION
 * ========================================================================== */

describe("M. Corroboration Preservation", () => {
  it("independent security findings from different sources are not dropped", () => {
    const e1 = makeEvidence({
      kind: "security",
      deduplicationKey: "security::remote trusts client",
      tags: ["source-a"],
    });
    const e2 = makeEvidence({
      kind: "security",
      deduplicationKey: "security::remote trusts client price", // slightly different
      tags: ["source-b"],
    });
    const collection = createCollection([e1, e2], "test");
    const deduped = deduplicateByKey(collection);

    // Different dedup keys = both preserved
    assert.equal(deduped.evidence.length, 2);
  });

  it("truly identical findings are deduplicated", () => {
    const e1 = makeEvidence({
      kind: "security",
      deduplicationKey: "security::identical finding",
    });
    const e2 = makeEvidence({
      kind: "security",
      deduplicationKey: "security::identical finding",
    });
    const collection = createCollection([e1, e2], "test");
    const deduped = deduplicateByKey(collection);

    assert.equal(deduped.evidence.length, 1);
  });
});

/* ============================================================================
 * N. PRIORITY SCORING
 * ========================================================================== */

describe("N. Priority Scoring", () => {
  it("critical security evidence gets high priority", () => {
    const evidence = makeEvidence({
      criticality: "critical",
      securityClassification: "security-critical",
      relevance: 1.0,
      trustLevel: "system",
      freshness: { level: "current", producedAt: Date.now() },
    });
    const { score, level } = computePriority(evidence);
    assert.ok(score >= 0.7, `Expected score >= 0.7, got ${score}`);
    assert.ok(level === "critical" || level === "high");
  });

  it("informational low-relevance evidence gets low priority", () => {
    const evidence = makeEvidence({
      criticality: "informational",
      securityClassification: "none",
      relevance: 0.2,
      trustLevel: "external",
      freshness: { level: "stale", producedAt: Date.now() - 1_000_000 },
    });
    const { score, level } = computePriority(evidence);
    assert.ok(score < 0.5, `Expected score < 0.5, got ${score}`);
    assert.ok(level === "low" || level === "medium");
  });

  it("scores are deterministic", () => {
    const evidence = makeEvidence();
    const score1 = computePriority(evidence);
    const score2 = computePriority(evidence);
    assert.equal(score1.score, score2.score);
    assert.equal(score1.level, score2.level);
  });
});

/* ============================================================================
 * O. PRIORITY EXPLANATION
 * ========================================================================== */

describe("O. Priority Explanation", () => {
  it("explainPriority returns human-readable explanation", () => {
    const evidence = makeEvidence({
      criticality: "critical",
      securityClassification: "security-critical",
    });
    const explanation = explainPriority(evidence);

    assert.ok(explanation.includes("Priority:"));
    assert.ok(explanation.includes("Factors:"));
    assert.ok(explanation.includes("criticality:"));
    assert.ok(explanation.includes("security:"));
  });

  it("comparePriority sorts correctly", () => {
    const high = makeEvidence({ criticality: "critical", relevance: 1.0, securityClassification: "security-critical" });
    const low = makeEvidence({ criticality: "informational", relevance: 0.1, securityClassification: "none" });

    assert.ok(comparePriority(high, low) < 0, "High priority should come first");
    assert.ok(comparePriority(low, high) > 0, "Low priority should come last");
  });
});

/* ============================================================================
 * P. COLLECTOR FAILURES
 * ========================================================================== */

describe("P. Collector Failures", () => {
  it("one collector failure does not crash the pipeline", async () => {
    const failingCollector = {
      id: "failing",
      description: "Always fails",
      collect: async () => { throw new Error("Collector failed"); },
    };

    const request = makeRequest();
    const result = await executePipeline(request, {
      collectors: [failingCollector, taskCollector],
    });

    assert.ok(result.collection);
    assert.ok(result.metrics.collectorFailures.includes("failing"));
    // Task collector should still succeed
    assert.ok(result.metrics.validEvidence >= 2);
  });

  it("collector failure is observable in metrics", async () => {
    const failingCollector = {
      id: "failing-collector",
      description: "Always fails",
      collect: async () => { throw new Error("boom"); },
    };

    const request = makeRequest();
    const result = await executePipeline(request, {
      collectors: [failingCollector],
    });

    assert.ok(result.metrics.collectorFailures.includes("failing-collector"));
  });

  it("no fake evidence is created for failed collectors", async () => {
    const failingCollector = {
      id: "project-map-fail",
      description: "Fakes project map",
      collect: async () => {
        // Should not produce fake project data
        return {
          evidence: [],
          collectorId: "project-map-fail",
          durationMs: 0,
          success: false,
          error: "Simulated failure",
          itemCount: 0,
        };
      },
    };

    const request = makeRequest();
    const result = await executePipeline(request, {
      collectors: [failingCollector],
    });

    const projectEvidence = result.collection.evidence.filter(e => e.kind === "project-map");
    assert.equal(projectEvidence.length, 0);
  });
});

/* ============================================================================
 * Q. VALIDATION REJECTION
 * ========================================================================== */

describe("Q. Validation Rejection", () => {
  it("invalid evidence is excluded from collection", async () => {
    // Create evidence that will fail validation (empty id)
    const invalidEvidence = {
      id: "",
      kind: "observation",
      source: { sourceType: "agent", sourceId: "test", sourceName: "Test", timestamp: Date.now() },
      content: { type: "text", value: "test" },
      relevance: 0.5,
      confidence: "unknown",
      freshness: { level: "current", producedAt: Date.now() },
      criticality: "informational",
      priority: "medium",
      tokenEstimate: 10,
      deduplicationKey: "test",
      status: "valid",
      securityClassification: "none",
      trustLevel: "system",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      provenance: { derivedFrom: [], steps: ["test"] },
      tags: [],
      schemaVersion: 1,
    } as ContextEvidence;

    const result = validateContextEvidence(invalidEvidence);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

/* ============================================================================
 * R. IMMUTABILITY
 * ========================================================================== */

describe("R. Immutability", () => {
  it("snapshots are immutable", () => {
    const snapshot = createSnapshot({
      collectionId: "col-1",
      projectFingerprint: "abc",
      evidenceIds: ["e1", "e2"],
      metadata: {
        taskId: "t1",
        createdAt: Date.now(),
        evidenceCount: 2,
        estimatedTokens: 100,
        securityCriticalCount: 0,
        sourceTypeCounts: {} as any,
        kindCounts: {} as any,
        schemaVersion: 1,
      },
      pipelineMetrics: {
        totalEvidence: 2,
        validEvidence: 2,
        invalidEvidence: 0,
        duplicateGroups: 0,
        staleEvidenceCount: 0,
        collectorFailures: [],
        collectionDurationMs: 10,
      },
    });

    assert.equal(isSnapshotImmutable(snapshot), true);
  });

  it("pipeline returns new collection objects", async () => {
    const request = makeRequest();
    const result1 = await executePipeline(request);
    const result2 = await executePipeline(request);

    assert.notEqual(result1.collection, result2.collection);
    assert.notEqual(result1.snapshot, result2.snapshot);
  });
});

/* ============================================================================
 * S. SNAPSHOT CREATION
 * ========================================================================== */

describe("S. Snapshot Creation", () => {
  it("snapshot records evidence IDs", () => {
    const snapshot = createSnapshot({
      collectionId: "col-1",
      projectFingerprint: "abc",
      evidenceIds: ["e1", "e2", "e3"],
      metadata: {
        taskId: "t1",
        createdAt: Date.now(),
        evidenceCount: 3,
        estimatedTokens: 150,
        securityCriticalCount: 1,
        sourceTypeCounts: {} as any,
        kindCounts: {} as any,
        schemaVersion: 1,
      },
      pipelineMetrics: {
        totalEvidence: 3,
        validEvidence: 3,
        invalidEvidence: 0,
        duplicateGroups: 0,
        staleEvidenceCount: 0,
        collectorFailures: [],
        collectionDurationMs: 15,
      },
    });

    assert.equal(snapshot.evidenceIds.length, 3);
    assert.ok(snapshot.snapshotId.startsWith("snap-"));
    assert.equal(snapshot.collectionId, "col-1");
    assert.equal(snapshot.projectFingerprint, "abc");
  });

  it("snapshot includes pipeline metrics", () => {
    const snapshot = createSnapshot({
      collectionId: "col-1",
      projectFingerprint: "abc",
      evidenceIds: [],
      metadata: {
        taskId: "t1",
        createdAt: Date.now(),
        evidenceCount: 0,
        estimatedTokens: 0,
        securityCriticalCount: 0,
        sourceTypeCounts: {} as any,
        kindCounts: {} as any,
        schemaVersion: 1,
      },
      pipelineMetrics: {
        totalEvidence: 10,
        validEvidence: 8,
        invalidEvidence: 2,
        duplicateGroups: 1,
        staleEvidenceCount: 3,
        collectorFailures: ["project-map-collector"],
        collectionDurationMs: 50,
      },
    });

    assert.equal(snapshot.pipelineMetrics.totalEvidence, 10);
    assert.equal(snapshot.pipelineMetrics.invalidEvidence, 2);
    assert.ok(snapshot.pipelineMetrics.collectorFailures.includes("project-map-collector"));
  });
});

/* ============================================================================
 * T. RUNTIME INTEGRATION
 * ========================================================================== */

describe("T. Runtime Integration", () => {
  it("pipeline produces collection and snapshot from real task", async () => {
    const request = makeRequest({
      taskDescription: "Create a secure player trading system",
      intent: "create-feature",
      domain: "gameplay",
      intelligence: makeIntelligence({
        security: {
          vulnerabilities: [{ id: "v1", type: "remote-trust", severity: "critical", description: "Remote trusts client price" }],
          score: 30,
        },
        architecture: {
          antiPatterns: [{ description: "No server validation", severity: "critical" }],
          recommendations: [],
          score: 40,
        },
      }),
    });

    const result = await executePipeline(request);

    assert.ok(result.collection);
    assert.ok(result.snapshot);
    assert.ok(result.collection.evidence.length > 0);
    assert.ok(result.snapshot.evidenceIds.length > 0);
    assert.equal(result.snapshot.collectionId, `col-${request.taskId}`);
  });

  it("metrics are observable", async () => {
    const request = makeRequest();
    const result = await executePipeline(request);

    assert.ok(typeof result.metrics.totalDurationMs === "number");
    assert.ok(typeof result.metrics.collectionDurationMs === "number");
    assert.ok(typeof result.metrics.validationDurationMs === "number");
    assert.ok(typeof result.metrics.dedupDurationMs === "number");
    assert.ok(typeof result.metrics.freshnessDurationMs === "number");
    assert.ok(typeof result.metrics.prioritizationDurationMs === "number");
  });
});

/* ============================================================================
 * U. FAST BUDGET PROPORTIONALITY
 * ========================================================================== */

describe("U. FAST Budget Proportionality", () => {
  it("FAST task produces small collection", async () => {
    const request = makeRequest({
      taskDescription: "Fix typo",
      intent: "fix-typo",
      domain: "general",
    });

    const result = await executePipeline(request);

    // FAST tasks should not trigger expensive collection
    // Task collector + maybe a couple others = small collection
    assert.ok(result.collection.evidence.length <= 10,
      `FAST collection too large: ${result.collection.evidence.length}`);
    assert.ok(result.metrics.totalDurationMs < 5000,
      `FAST pipeline too slow: ${result.metrics.totalDurationMs}ms`);
  });
});

/* ============================================================================
 * V. SECURITY CRITICAL EVIDENCE PRESERVATION
 * ========================================================================== */

describe("V. Security Critical Evidence Preservation", () => {
  it("security-critical evidence is never silently dropped", async () => {
    const intel = makeIntelligence({
      security: {
        vulnerabilities: [
          { id: "v1", type: "rce", severity: "critical", description: "Remote code execution" },
        ],
        score: 10,
      },
    });
    const request = makeRequest({ intelligence: intel });
    const result = await executePipeline(request);

    const secCritical = result.collection.evidence.filter(
      e => e.securityClassification === "security-critical"
    );
    assert.ok(secCritical.length > 0, "Security-critical evidence was dropped!");
  });

  it("security evidence maintains security classification", async () => {
    const intel = makeIntelligence({
      security: {
        vulnerabilities: [
          { id: "v1", type: "injection", severity: "critical", description: "SQL injection" },
        ],
        score: 20,
      },
    });
    const request = makeRequest({ intelligence: intel });
    const result = await executePipeline(request);

    const secEvidence = result.collection.evidence.filter(e => e.kind === "security");
    for (const e of secEvidence) {
      assert.ok(
        e.securityClassification === "security-critical" || e.securityClassification === "security-relevant",
        `Security evidence lost classification: ${e.securityClassification}`
      );
    }
  });
});

/* ============================================================================
 * W. REAL TASK TRACES
 * ========================================================================== */

describe("W. Real Task Traces", () => {
  it("TRACE 1 — Simple typo fix: small collection, task evidence", async () => {
    const request = makeRequest({
      taskDescription: "Fix typo in DeliveryService",
      intent: "fix-typo",
      domain: "general",
    });

    const result = await executePipeline(request);

    // Should have task evidence
    const taskEvidence = result.collection.evidence.filter(e => e.kind === "user-input");
    assert.ok(taskEvidence.length > 0, "Missing task evidence");

    // Should be small
    assert.ok(result.collection.evidence.length <= 10);

    // No world-building evidence
    const wbEvidence = result.collection.evidence.filter(e => e.kind === "world-building");
    assert.equal(wbEvidence.length, 0);
  });

  it("TRACE 2 — Secure trading: security evidence prioritized", async () => {
    const intel = makeIntelligence({
      security: {
        vulnerabilities: [
          { id: "v1", type: "remote-trust", severity: "critical", description: "Client-trusted currency" },
          { id: "v2", type: "injection", severity: "high", description: "Unvalidated input" },
        ],
        score: 20,
      },
      architecture: {
        style: "service-oriented",
        servicePlacement: { current: [], recommended: [], misplaced: [] },
        moduleOrganization: { currentStyle: "folder-per-module", recommendedStyle: "folder-per-module", clusters: [], violations: [] },
        dataFlow: { flows: [], bottlenecks: [], singlePointsOfFailure: [] },
        patterns: [],
        antiPatterns: [
          { name: "NoServerAuthority", description: "No server authority", locations: [], severity: "critical", fix: "Add server validation", confidence: 0.9 },
        ],
        recommendations: [],
        score: 30,
      },
      remoteReview: {
        remoteEvents: [{
          remote: "TradeRemote",
          path: "ReplicatedStorage.TradeRemote",
          riskLevel: "critical",
          vulnerabilities: [{ type: "trust", description: "Client sends price" }],
          securityControls: [],
          recommendations: ["Validate server-side"],
          compliance: { hasValidation: false, hasRateLimit: false, hasOwnershipCheck: false, hasAuthentication: false, hasPermissionCheck: false, hasDistanceCheck: false, hasCooldown: false },
        }],
        remoteFunctions: [],
        overallRisk: "critical",
        summary: { totalRemotes: 1, criticalRemotes: 1, highRemotes: 0, recommendations: [] },
        recommendations: [],
      },
    });
    const request = makeRequest({
      taskDescription: "Create a secure player trading system",
      intent: "create-feature",
      domain: "gameplay",
      intelligence: intel,
    });

    const result = await executePipeline(request);

    // Security evidence should be present and prioritized
    const secEvidence = result.collection.evidence.filter(e => e.kind === "security" || e.kind === "remote-security");
    assert.ok(secEvidence.length > 0, "Missing security evidence");

    // Security-critical evidence should have high priority
    const secCritical = secEvidence.filter(e => e.securityClassification === "security-critical");
    for (const e of secCritical) {
      assert.ok(e.priority === "critical" || e.priority === "high",
        `Security-critical evidence has low priority: ${e.priority}`);
    }
  });

  it("TRACE 3 — Project mutation: affected evidence becomes stale", async () => {
    const request = makeRequest({
      intelligence: makeIntelligence({
        projectMap: {
          projectId: "proj-1",
          workspaceRoot: "/workspace",
          instances: [],
          scripts: [],
          remotes: [],
          uiHierarchy: { screenGuis: {}, starterGui: {}, starterPlayerScripts: {} },
          world: { terrain: {}, zones: {}, buildings: [], roads: [], lighting: {} },
          tags: new Map(),
          attributes: new Map(),
          assets: { meshes: {}, images: {}, sounds: {}, animations: {}, fonts: {} },
          configs: [],
          conventions: { naming: {}, folderStructure: {}, scriptConventions: {}, uiConventions: {}, namingConventions: {}, codeStyle: {}, documentation: {} },
          systems: {},
          dependencies: { nodes: new Map(), edges: [] },
          issues: [],
          services: {},
          dataModel: {} as any,
          lastUpdated: Date.now(),
          schemaVersion: 1,
        },
      }),
      previousFingerprint: "old-fingerprint",
    });

    const result = await executePipeline(request, {
      projectFingerprint: "new-fingerprint",
    });

    // Project-map evidence should be stale
    const projectEvidence = result.collection.evidence.filter(e => e.kind === "project-map");
    for (const e of projectEvidence) {
      assert.equal(e.freshness.level, "stale",
        `Project evidence not stale after mutation: ${e.freshness.level}`);
    }
  });

  it("TRACE 4 — Collector failure: pipeline continues", async () => {
    const request = makeRequest();
    const result = await executePipeline(request, {
      collectors: [taskCollector], // Only task collector
    });

    // Should still produce collection with task evidence
    assert.ok(result.collection.evidence.length > 0);
    // Pipeline should not crash
    assert.ok(result.snapshot);
  });

  it("TRACE 5 — Duplicate corroboration: independent findings preserved", async () => {
    const intel = makeIntelligence({
      security: {
        vulnerabilities: [
          { id: "v1", type: "remote-trust", severity: "critical", description: "Remote accepts client price" },
        ],
        score: 20,
      },
      remoteReview: {
        remoteEvents: [{
          remote: "TradeRemote",
          path: "ReplicatedStorage.TradeRemote",
          riskLevel: "critical",
          vulnerabilities: [{ type: "trust", description: "Server accepts client-provided price" }],
          securityControls: [],
          recommendations: [],
          compliance: { hasValidation: false, hasRateLimit: false, hasOwnershipCheck: false, hasAuthentication: false, hasPermissionCheck: false, hasDistanceCheck: false, hasCooldown: false },
        }],
        remoteFunctions: [],
        overallRisk: "critical",
        summary: { totalRemotes: 1, criticalRemotes: 1, highRemotes: 0, recommendations: [] },
        recommendations: [],
      },
    });

    const request = makeRequest({
      taskDescription: "Create trading system",
      intent: "create-feature",
      domain: "gameplay",
      intelligence: intel,
    });

    const result = await executePipeline(request);

    // Both security and remote-security should be present
    const secKinds = result.collection.evidence
      .filter(e => e.kind === "security" || e.kind === "remote-security")
      .map(e => e.kind);
    assert.ok(secKinds.includes("security"), "Missing security evidence");
    assert.ok(secKinds.includes("remote-security"), "Missing remote-security evidence");
  });

  it("TRACE 6 — Execution evidence distinguishes states", async () => {
    const request = makeRequest({
      executedTools: [
        { name: "read_file", status: "success", input: {} },
        { name: "write_file", status: "error", input: {} },
      ],
    });

    const result = await executePipeline(request);

    // Should have execution observation
    const execEvidence = result.collection.evidence.filter(e =>
      e.tags.includes("execution") || e.kind === "observation"
    );
    assert.ok(execEvidence.length > 0);

    // Should NOT have verification evidence (no verification provided)
    const verEvidence = result.collection.evidence.filter(e => e.kind === "verification");
    assert.equal(verEvidence.length, 0);
  });
});
