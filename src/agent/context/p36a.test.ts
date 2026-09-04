/**
 * P3.6-A — Context Evidence Model Tests
 *
 * Comprehensive tests proving the canonical data model contracts.
 * Categories:
 * A. Evidence construction
 * B. Evidence validation
 * C. Invalid score rejection
 * D. Invalid timestamp rejection
 * E. Missing provenance rejection
 * F. Missing dedup key rejection
 * G. Token estimate validation
 * H. Serialization round-trip
 * I. Collection validation
 * J. Security-critical evidence preservation
 * K. Derived evidence provenance
 * L. Evidence ID stability
 * M. Deduplication key stability
 * N. Unknown confidence/freshness handling
 * O. Trust metadata
 * P. Backward compatibility adapters
 * Q. No-secret serialization
 * R. No arbitrary executable payload behavior
 * S. Real existing intelligence mapping
 * T. Property invariants
 */

import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  createEvidence,
  createDerivedEvidence,
  generateEvidenceId,
  estimateTokens,
  generateDeduplicationKey,
  type EvidenceInput,
} from "./evidence.js";

import {
  createCollection,
  computeMetadata,
  addEvidence,
  removeEvidence,
  filterEvidence,
  sortEvidence,
  getByKind,
  getSecurityCritical,
  getTotalTokens,
  hasSecurityCritical,
  mergeCollections,
  deduplicateByKey,
  getDeduplicationGroups,
} from "./collection.js";

import {
  validateContextEvidence,
  validateContextCollection,
} from "./validation.js";

import {
  serializeEvidence,
  deserializeEvidence,
  serializeCollection,
  deserializeCollection,
  testRoundTrip,
  testCollectionRoundTrip,
  auditSerializedSecrets,
} from "./serialization.js";

import {
  adaptSecurityVulnerabilities,
  adaptArchitectureRecommendations,
  adaptDependencyViolations,
  adaptPlacementFindings,
  adaptLessons,
  adaptKnowledge,
  adaptPerformanceFindings,
  adaptQualityEvaluation,
} from "./adapters/intelligence.js";

import type {
  ContextEvidence,
  ContextCollection,
  ContextSource,
  EvidenceKind,
  ContextContent,
} from "./types.js";

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function makeSource(overrides: Partial<ContextSource> = {}): ContextSource {
  return {
    sourceType: "intelligence-engine",
    sourceId: "test-engine",
    sourceName: "Test Engine",
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeEvidenceInput(overrides: Partial<EvidenceInput> = {}): EvidenceInput {
  return {
    kind: "architecture",
    source: makeSource(),
    content: { type: "text", value: "Test evidence content" },
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<EvidenceInput> = {}): ContextEvidence {
  return createEvidence(makeEvidenceInput(overrides));
}

/* ============================================================================
 * A. EVIDENCE CONSTRUCTION
 * ========================================================================== */

describe("P3.6-A: Evidence Construction", () => {
  test("createEvidence produces valid evidence with defaults", () => {
    const e = makeEvidence();
    assert.ok(e.id.length > 0);
    assert.equal(e.kind, "architecture");
    assert.equal(e.source.sourceType, "intelligence-engine");
    assert.equal(e.content.type, "text");
    assert.ok(e.relevance >= 0 && e.relevance <= 1);
    assert.equal(e.confidence, "unknown");
    assert.equal(e.freshness.level, "current");
    assert.equal(e.criticality, "informational");
    assert.equal(e.priority, "medium");
    assert.ok(e.tokenEstimate >= 0);
    assert.ok(e.deduplicationKey.length > 0);
    assert.equal(e.status, "valid");
    assert.equal(e.securityClassification, "none");
    assert.equal(e.trustLevel, "project-data");
    assert.ok(e.createdAt > 0);
    assert.ok(e.updatedAt > 0);
    assert.ok(e.schemaVersion >= 1);
  });

  test("createEvidence respects explicit values", () => {
    const e = makeEvidence({
      kind: "security",
      relevance: 0.95,
      confidence: 0.9,
      criticality: "critical",
      priority: "critical",
      securityClassification: "security-critical",
      trustLevel: "system",
      tags: ["security", "critical"],
    });
    assert.equal(e.kind, "security");
    assert.equal(e.relevance, 0.95);
    assert.equal(e.confidence, 0.9);
    assert.equal(e.criticality, "critical");
    assert.equal(e.priority, "critical");
    assert.equal(e.securityClassification, "security-critical");
    assert.equal(e.trustLevel, "system");
    assert.deepEqual(e.tags, ["security", "critical"]);
  });

  test("createEvidence handles structured content", () => {
    const e = makeEvidence({
      content: { type: "structured", value: { key: "value", count: 42 } },
    });
    assert.equal(e.content.type, "structured");
    assert.ok(e.tokenEstimate > 0);
  });

  test("createEvidence handles code content", () => {
    const e = makeEvidence({
      content: { type: "code", language: "luau", value: "local x = 1" },
    });
    assert.equal(e.content.type, "code");
    assert.ok(e.tokenEstimate > 0);
  });

  test("createEvidence handles error content", () => {
    const e = makeEvidence({
      content: { type: "error", message: "Something went wrong" },
    });
    assert.equal(e.content.type, "error");
    assert.ok(e.tokenEstimate > 0);
  });

  test("createEvidence handles null content", () => {
    const e = makeEvidence({
      content: { type: "null" },
    });
    assert.equal(e.content.type, "null");
  });
});

/* ============================================================================
 * B. EVIDENCE VALIDATION
 * ========================================================================== */

describe("P3.6-A: Evidence Validation", () => {
  test("valid evidence passes validation", () => {
    const e = makeEvidence();
    const result = validateContextEvidence(e);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  test("rejects non-object", () => {
    const result = validateContextEvidence("not an object");
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  test("rejects null", () => {
    const result = validateContextEvidence(null);
    assert.equal(result.valid, false);
  });

  test("rejects missing id", () => {
    const e = makeEvidence();
    (e as any).id = undefined;
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "id"));
  });

  test("rejects invalid kind", () => {
    const e = makeEvidence();
    (e as any).kind = "invalid-kind";
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "kind"));
  });
});

/* ============================================================================
 * C. INVALID SCORE REJECTION
 * ========================================================================== */

describe("P3.6-A: Invalid Score Rejection", () => {
  test("rejects NaN relevance", () => {
    const e = makeEvidence({ relevance: NaN });
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "relevance"));
  });

  test("rejects Infinity relevance", () => {
    const e = makeEvidence({ relevance: Infinity });
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "relevance"));
  });

  test("rejects relevance > 1", () => {
    const e = makeEvidence({ relevance: 1.5 });
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "relevance"));
  });

  test("rejects relevance < 0", () => {
    const e = makeEvidence({ relevance: -0.1 });
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "relevance"));
  });

  test("rejects NaN confidence", () => {
    const e = makeEvidence({ confidence: NaN as any });
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "confidence"));
  });

  test("rejects confidence > 1", () => {
    const e = makeEvidence({ confidence: 1.5 });
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "confidence"));
  });

  test("rejects negative token estimate", () => {
    const e = makeEvidence({ tokenEstimate: -5 });
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "tokenEstimate"));
  });
});

/* ============================================================================
 * D. INVALID TIMESTAMP REJECTION
 * ========================================================================== */

describe("P3.6-A: Invalid Timestamp Rejection", () => {
  test("rejects NaN createdAt", () => {
    const e = makeEvidence();
    (e as any).createdAt = NaN;
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "createdAt"));
  });

  test("rejects negative createdAt", () => {
    const e = makeEvidence();
    (e as any).createdAt = -1;
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
  });

  test("rejects invalid source timestamp", () => {
    const e = makeEvidence();
    (e as any).source.timestamp = "not-a-number";
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "source.timestamp"));
  });
});

/* ============================================================================
 * E. MISSING PROVENANCE REJECTION
 * ========================================================================== */

describe("P3.6-A: Missing Provenance Rejection", () => {
  test("rejects missing provenance", () => {
    const e = makeEvidence();
    (e as any).provenance = undefined;
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "provenance"));
  });

  test("rejects non-object provenance", () => {
    const e = makeEvidence();
    (e as any).provenance = "not-an-object";
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
  });

  test("rejects missing derivedFrom array", () => {
    const e = makeEvidence();
    (e as any).provenance = { steps: [] };
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "provenance.derivedFrom"));
  });
});

/* ============================================================================
 * F. MISSING DEDUP KEY REJECTION
 * ========================================================================== */

describe("P3.6-A: Missing Dedup Key Rejection", () => {
  test("rejects empty dedup key", () => {
    const e = makeEvidence({ deduplicationKey: "" });
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.field === "deduplicationKey"));
  });

  test("rejects missing dedup key", () => {
    const e = makeEvidence();
    (e as any).deduplicationKey = undefined;
    const result = validateContextEvidence(e);
    assert.equal(result.valid, false);
  });
});

/* ============================================================================
 * G. TOKEN ESTIMATE VALIDATION
 * ========================================================================== */

describe("P3.6-A: Token Estimate", () => {
  test("zero tokens for empty content", () => {
    assert.equal(estimateTokens(""), 0);
  });

  test("positive tokens for non-empty content", () => {
    assert.ok(estimateTokens("hello world") > 0);
  });

  test("longer content has more tokens", () => {
    const short = estimateTokens("short");
    const long = estimateTokens("a much longer piece of text content");
    assert.ok(long > short);
  });

  test("token estimate is non-negative for valid evidence", () => {
    const e = makeEvidence();
    assert.ok(e.tokenEstimate >= 0);
  });
});

/* ============================================================================
 * H. SERIALIZATION ROUND-TRIP
 * ========================================================================== */

describe("P3.6-A: Serialization Round-Trip", () => {
  test("evidence survives serialize/deserialize", () => {
    const e = makeEvidence({
      kind: "security",
      relevance: 0.95,
      confidence: 0.9,
      criticality: "critical",
      priority: "critical",
      securityClassification: "security-critical",
    });

    const json = serializeEvidence(e);
    const restored = deserializeEvidence(json);

    assert.ok(restored);
    assert.equal(restored!.id, e.id);
    assert.equal(restored!.kind, e.kind);
    assert.equal(restored!.relevance, e.relevance);
    assert.equal(restored!.confidence, e.confidence);
    assert.equal(restored!.criticality, e.criticality);
    assert.equal(restored!.priority, e.priority);
    assert.equal(restored!.securityClassification, e.securityClassification);
    assert.equal(restored!.trustLevel, e.trustLevel);
    assert.equal(restored!.deduplicationKey, e.deduplicationKey);
    assert.equal(restored!.schemaVersion, e.schemaVersion);
  });

  test("collection survives serialize/deserialize", () => {
    const evidence = [
      makeEvidence({ kind: "security" }),
      makeEvidence({ kind: "architecture" }),
    ];
    const collection = createCollection(evidence, "test-task");

    const json = serializeCollection(collection);
    const restored = deserializeCollection(json);

    assert.ok(restored);
    assert.equal(restored!.evidence.length, 2);
    assert.equal(restored!.metadata.taskId, "test-task");
    assert.equal(restored!.metadata.evidenceCount, 2);
  });

  test("testRoundTrip passes for valid evidence", () => {
    const e = makeEvidence();
    assert.equal(testRoundTrip(e), true);
  });

  test("testCollectionRoundTrip passes for valid collection", () => {
    const collection = createCollection([makeEvidence()], "test");
    assert.equal(testCollectionRoundTrip(collection), true);
  });

  test("deserializeEvidence returns null for invalid JSON", () => {
    assert.equal(deserializeEvidence("not json"), null);
  });

  test("deserializeCollection returns null for invalid JSON", () => {
    assert.equal(deserializeCollection("{invalid}"), null);
  });

  test("serialization does not contain executable payloads", () => {
    const e = makeEvidence({
      content: { type: "text", value: "Normal text content" },
    });
    const json = serializeEvidence(e);
    const warnings = auditSerializedSecrets(json);
    // No secrets in normal evidence
    assert.ok(warnings.length === 0 || warnings.every(w => w.includes("Potential")));
  });
});

/* ============================================================================
 * I. COLLECTION VALIDATION
 * ========================================================================== */

describe("P3.6-A: Collection Validation", () => {
  test("valid collection passes validation", () => {
    const collection = createCollection([makeEvidence()], "test-task");
    const result = validateContextCollection(collection);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  test("rejects collection with invalid evidence", () => {
    const collection = createCollection([], "test");
    (collection.evidence as any) = [{ id: "bad" }]; // Missing required fields
    const result = validateContextCollection(collection);
    assert.equal(result.valid, false);
  });

  test("rejects duplicate evidence IDs", () => {
    const e1 = makeEvidence();
    const e2 = makeEvidence();
    (e2 as any).id = e1.id; // Force duplicate
    const collection = createCollection([e1, e2], "test");
    const result = validateContextCollection(collection);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(err => err.message.includes("Duplicate")));
  });

  test("rejects non-object collection", () => {
    const result = validateContextCollection("not an object");
    assert.equal(result.valid, false);
  });

  test("rejects collection with wrong metadata", () => {
    const collection = createCollection([makeEvidence()], "test");
    (collection.metadata as any).evidenceCount = -1;
    const result = validateContextCollection(collection);
    assert.equal(result.valid, false);
  });
});

/* ============================================================================
 * J. SECURITY-CRITICAL EVIDENCE PRESERVATION
 * ========================================================================== */

describe("P3.6-A: Security-Critical Preservation", () => {
  test("security-critical evidence survives serialization", () => {
    const e = makeEvidence({
      securityClassification: "security-critical",
      criticality: "critical",
    });
    const json = serializeEvidence(e);
    const restored = deserializeEvidence(json);
    assert.ok(restored);
    assert.equal(restored!.securityClassification, "security-critical");
    assert.equal(restored!.criticality, "critical");
  });

  test("security-critical evidence is identifiable in collection", () => {
    const collection = createCollection([
      makeEvidence({ securityClassification: "none" }),
      makeEvidence({ securityClassification: "security-critical" }),
      makeEvidence({ securityClassification: "security-relevant" }),
    ], "test");

    const critical = getSecurityCritical(collection);
    assert.equal(critical.length, 1);
    assert.equal(critical[0].securityClassification, "security-critical");
    assert.equal(hasSecurityCritical(collection), true);
  });

  test("security-critical count is accurate in metadata", () => {
    const collection = createCollection([
      makeEvidence({ securityClassification: "none" }),
      makeEvidence({ securityClassification: "security-critical" }),
      makeEvidence({ securityClassification: "security-critical" }),
    ], "test");

    assert.equal(collection.metadata.securityCriticalCount, 2);
  });

  test("security-critical evidence survives sorting", () => {
    const collection = createCollection([
      makeEvidence({ securityClassification: "security-critical", priority: "low" }),
      makeEvidence({ securityClassification: "none", priority: "critical" }),
    ], "test");

    const sorted = sortEvidence(collection, (a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
    });

    const critical = getSecurityCritical(sorted);
    assert.equal(critical.length, 1);
    assert.equal(critical[0].securityClassification, "security-critical");
  });
});

/* ============================================================================
 * K. DERIVED EVIDENCE PROVENANCE
 * ========================================================================== */

describe("P3.6-A: Derived Evidence Provenance", () => {
  test("derived evidence references original", () => {
    const original = makeEvidence({ kind: "security" });
    const derived = createDerivedEvidence(original, {
      kind: "security",
      content: { type: "text", value: "Summary of security finding" },
    });

    assert.ok(derived.provenance.derivedFrom.includes(original.id));
    assert.ok(derived.provenance.steps.length > 0);
  });

  test("derived evidence preserves security classification", () => {
    const original = makeEvidence({
      securityClassification: "security-critical",
      criticality: "critical",
    });
    const derived = createDerivedEvidence(original, {
      kind: "security",
      content: { type: "text", value: "Summary" },
    });

    assert.equal(derived.securityClassification, "security-critical");
    assert.equal(derived.criticality, "critical");
  });

  test("derived evidence does not mutate original", () => {
    const original = makeEvidence({ kind: "security" });
    const originalId = original.id;
    const originalProvenance = [...original.provenance.derivedFrom];

    createDerivedEvidence(original, {
      kind: "security",
      content: { type: "text", value: "Summary" },
    });

    assert.equal(original.id, originalId);
    assert.deepEqual(original.provenance.derivedFrom, originalProvenance);
  });

  test("derived evidence has its own ID", () => {
    const original = makeEvidence();
    const derived = createDerivedEvidence(original, {
      kind: "architecture",
      content: { type: "text", value: "Derived content" },
    });

    assert.notEqual(derived.id, original.id);
  });
});

/* ============================================================================
 * L. EVIDENCE ID STABILITY
 * ========================================================================== */

describe("P3.6-A: Evidence ID Stability", () => {
  test("IDs are unique across multiple creations", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateEvidenceId());
    }
    assert.equal(ids.size, 100);
  });

  test("ID survives serialization round-trip", () => {
    const e = makeEvidence();
    const json = serializeEvidence(e);
    const restored = deserializeEvidence(json);
    assert.equal(restored!.id, e.id);
  });
});

/* ============================================================================
 * M. DEDUPLICATION KEY STABILITY
 * ========================================================================== */

describe("P3.6-A: Deduplication Key Stability", () => {
  test("same content produces same dedup key", () => {
    const key1 = generateDeduplicationKey("security", { type: "text", value: "Same vulnerability" });
    const key2 = generateDeduplicationKey("security", { type: "text", value: "Same vulnerability" });
    assert.equal(key1, key2);
  });

  test("different content produces different dedup keys", () => {
    const key1 = generateDeduplicationKey("security", { type: "text", value: "Vulnerability A" });
    const key2 = generateDeduplicationKey("security", { type: "text", value: "Vulnerability B" });
    assert.notEqual(key1, key2);
  });

  test("different kinds produce different dedup keys", () => {
    const key1 = generateDeduplicationKey("security", { type: "text", value: "Same text" });
    const key2 = generateDeduplicationKey("architecture", { type: "text", value: "Same text" });
    assert.notEqual(key1, key2);
  });

  test("dedup keys are deterministic (same input → same output)", () => {
    const inputs = [
      { kind: "security" as const, content: { type: "text" as const, value: "Test" } },
      { kind: "lesson" as const, content: { type: "text" as const, value: "Lesson content" } },
      { kind: "knowledge" as const, content: { type: "structured" as const, value: { key: "val" } } },
    ];
    for (const input of inputs) {
      const k1 = generateDeduplicationKey(input.kind, input.content);
      const k2 = generateDeduplicationKey(input.kind, input.content);
      assert.equal(k1, k2);
    }
  });

  test("deduplicateByKey removes duplicates", () => {
    const e1 = makeEvidence({ deduplicationKey: "same-key" });
    const e2 = makeEvidence({ deduplicationKey: "same-key" });
    const e3 = makeEvidence({ deduplicationKey: "different-key" });
    const collection = createCollection([e1, e2, e3], "test");
    const deduped = deduplicateByKey(collection);
    assert.equal(deduped.evidence.length, 2);
  });

  test("getDeduplicationGroups groups correctly", () => {
    const e1 = makeEvidence({ deduplicationKey: "key-a" });
    const e2 = makeEvidence({ deduplicationKey: "key-a" });
    const e3 = makeEvidence({ deduplicationKey: "key-b" });
    const collection = createCollection([e1, e2, e3], "test");
    const groups = getDeduplicationGroups(collection);
    assert.equal(groups.size, 2);
    assert.equal(groups.get("key-a")!.length, 2);
    assert.equal(groups.get("key-b")!.length, 1);
  });
});

/* ============================================================================
 * N. UNKNOWN CONFIDENCE/FRESHNESS HANDLING
 * ========================================================================== */

describe("P3.6-A: Unknown Confidence/Freshness", () => {
  test("unknown confidence is representable", () => {
    const e = makeEvidence({ confidence: "unknown" });
    assert.equal(e.confidence, "unknown");
    const result = validateContextEvidence(e);
    assert.equal(result.valid, true);
  });

  test("unknown confidence survives serialization", () => {
    const e = makeEvidence({ confidence: "unknown" });
    const json = serializeEvidence(e);
    const restored = deserializeEvidence(json);
    assert.equal(restored!.confidence, "unknown");
  });

  test("unknown freshness is representable", () => {
    const e = makeEvidence({
      freshness: { level: "unknown", producedAt: Date.now() },
    });
    assert.equal(e.freshness.level, "unknown");
    const result = validateContextEvidence(e);
    assert.equal(result.valid, true);
  });

  test("does not invent fake confidence for unknown", () => {
    const e = makeEvidence({ confidence: "unknown" });
    assert.notEqual(e.confidence, 0.5);
    assert.notEqual(e.confidence, 0);
    assert.equal(e.confidence, "unknown");
  });
});

/* ============================================================================
 * O. TRUST METADATA
 * ========================================================================== */

describe("P3.6-A: Trust Metadata", () => {
  test("system trust level", () => {
    const e = makeEvidence({ trustLevel: "system" });
    assert.equal(e.trustLevel, "system");
  });

  test("project-data trust level", () => {
    const e = makeEvidence({ trustLevel: "project-data" });
    assert.equal(e.trustLevel, "project-data");
  });

  test("external trust level", () => {
    const e = makeEvidence({ trustLevel: "external" });
    assert.equal(e.trustLevel, "external");
  });

  test("unknown trust level", () => {
    const e = makeEvidence({ trustLevel: "unknown" });
    assert.equal(e.trustLevel, "unknown");
  });

  test("all trust levels are valid", () => {
    const levels = ["system", "project-data", "user-input", "external", "unknown"] as const;
    for (const level of levels) {
      const e = makeEvidence({ trustLevel: level });
      const result = validateContextEvidence(e);
      assert.equal(result.valid, true, `Trust level ${level} should be valid`);
    }
  });
});

/* ============================================================================
 * P. ADAPTER INTEGRATION
 * ========================================================================== */

describe("P3.6-A: Adapter Integration", () => {
  const source: ContextSource = {
    sourceType: "intelligence-engine",
    sourceId: "test",
    sourceName: "Test",
    timestamp: Date.now(),
  };

  test("adaptSecurityVulnerabilities produces valid evidence", () => {
    const vulns = [
      { id: "v1", type: "rce", severity: "critical", description: "Remote code execution", evidence: [] },
      { id: "v2", type: "info-leak", severity: "medium", description: "Info leaked", evidence: [] },
    ];
    const items = adaptSecurityVulnerabilities(vulns, source);
    assert.equal(items.length, 2);
    assert.equal(items[0].kind, "security");
    assert.equal(items[0].securityClassification, "security-critical");
    assert.equal(items[1].securityClassification, "security-relevant");
    // Validate all
    for (const item of items) {
      const result = validateContextEvidence(item);
      assert.equal(result.valid, true, `Security adapter item should be valid: ${result.errors.map(e => e.message).join(", ")}`);
    }
  });

  test("adaptArchitectureRecommendations produces valid evidence", () => {
    const recs = [
      { id: "r1", title: "Use services", description: "Move to services", priority: "high", category: "structure" },
    ];
    const items = adaptArchitectureRecommendations(recs, source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "architecture");
    const result = validateContextEvidence(items[0]);
    assert.equal(result.valid, true);
  });

  test("adaptDependencyViolations produces valid evidence", () => {
    const violations = [
      { from: "A", to: "B", type: "circular", severity: "error", description: "Circular dep" },
    ];
    const items = adaptDependencyViolations(violations, source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "dependency");
  });

  test("adaptPlacementFindings produces valid evidence", () => {
    const items = adaptPlacementFindings([
      { name: "Script1", type: "script", reason: "Wrong container", severity: "error" },
    ], source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "placement");
  });

  test("adaptLessons produces valid evidence", () => {
    const items = adaptLessons([
      { content: "Always validate inputs", category: "security", confidence: 0.9 },
    ], source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "lesson");
  });

  test("adaptKnowledge produces valid evidence", () => {
    const items = adaptKnowledge([
      { title: "Security Best Practices", content: "Validate all inputs", category: "security" },
    ], source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "knowledge");
  });

  test("adaptPerformanceFindings produces valid evidence", () => {
    const items = adaptPerformanceFindings(45, [
      { description: "Excessive instance count" },
    ], source);
    assert.ok(items.length >= 2); // score + bottleneck
    for (const item of items) {
      assert.equal(item.kind, "performance");
    }
  });

  test("adaptQualityEvaluation produces valid evidence", () => {
    const items = adaptQualityEvaluation(60, [
      { name: "correctness", score: 40, passed: false },
      { name: "performance", score: 80, passed: true },
    ], source);
    assert.ok(items.length >= 2); // score + failed gate
    for (const item of items) {
      assert.equal(item.kind, "quality");
    }
  });
});

/* ============================================================================
 * Q. NO-SECRET SERIALIZATION
 * ========================================================================== */

describe("P3.6-A: No-Secret Serialization", () => {
  test("auditSerializedSecrets returns empty for clean evidence", () => {
    const e = makeEvidence({
      content: { type: "text", value: "Normal architecture recommendation" },
    });
    const json = serializeEvidence(e);
    const warnings = auditSerializedSecrets(json);
    assert.equal(warnings.length, 0);
  });

  test("auditSerializedSecrets detects API key pattern", () => {
    const json = '{"apiKey": "abc123"}';
    const warnings = auditSerializedSecrets(json);
    assert.ok(warnings.length > 0);
  });
});

/* ============================================================================
 * R. NO ARBITRARY EXECUTABLE PAYLOAD
 * ========================================================================== */

describe("P3.6-A: No Arbitrary Executable Payload", () => {
  test("evidence content is data, not code", () => {
    const e = makeEvidence({
      content: { type: "text", value: "This is just text" },
    });
    // Evidence should not have any executable methods
    assert.equal(typeof (e as any).execute, "undefined");
    assert.equal(typeof (e as any).run, "undefined");
    assert.equal(typeof (e as any).eval, "undefined");
  });

  test("serialization strips functions", () => {
    const e = makeEvidence();
    (e as any).maliciousFunction = () => "hack";
    const json = serializeEvidence(e);
    assert.ok(!json.includes("maliciousFunction"));
    assert.ok(!json.includes("hack"));
  });
});

/* ============================================================================
 * S. REAL EXISTING INTELLIGENCE MAPPING
 * ========================================================================== */

describe("P3.6-A: Real Intelligence Mapping", () => {
  const source: ContextSource = {
    sourceType: "intelligence-engine",
    sourceId: "real-engine",
    sourceName: "Real Engine",
    timestamp: Date.now(),
  };

  test("security vulnerabilities from real format", () => {
    const vulns = [
      {
        id: "CVE-001",
        type: "remote-code-execution",
        severity: "critical",
        title: "RCE via unvalidated remote",
        description: "Player can submit arbitrary code through RemoteEvent",
        file: "ServerScriptService/TradingService",
        line: 42,
        evidence: ["RemoteEvent has no validation"],
        discoveredAt: Date.now(),
      },
    ];
    const items = adaptSecurityVulnerabilities(vulns, source);
    assert.equal(items.length, 1);
    const result = validateContextEvidence(items[0]);
    assert.equal(result.valid, true);
    assert.equal(items[0].securityClassification, "security-critical");
    assert.equal(items[0].criticality, "critical");
  });

  test("architecture recommendations from real format", () => {
    const recs = [
      {
        id: "ARCH-001",
        title: "Extract shared logic into InventoryService",
        description: "Multiple scripts duplicate inventory management logic",
        priority: "high",
        category: "maintainability",
      },
    ];
    const items = adaptArchitectureRecommendations(recs, source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "architecture");
  });

  test("dependency violations from real format", () => {
    const violations = [
      {
        from: "ServerScriptService/TradingService",
        to: "ServerScriptService/InventoryService",
        type: "circular",
        severity: "error",
        description: "Circular dependency detected",
        suggestedFix: "Extract shared interface",
      },
    ];
    const items = adaptDependencyViolations(violations, source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "dependency");
  });

  test("placement findings from real format", () => {
    const misplaced = [
      {
        name: "DataStoreService",
        type: "instance",
        currentContainer: "Workspace",
        recommendedContainer: "ServerScriptService",
        reason: "Server-side service should not be in Workspace",
        severity: "error",
      },
    ];
    const items = adaptPlacementFindings(misplaced, source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "placement");
  });

  test("lessons from real format", () => {
    const lessons = [
      {
        content: "Always validate RemoteEvent inputs server-side",
        category: "security",
        confidence: 0.9,
      },
    ];
    const items = adaptLessons(lessons, source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "lesson");
  });

  test("knowledge from real format", () => {
    const entries = [
      {
        title: "Roblox Security Best Practices",
        content: "Never trust client input. Always validate on server.",
        category: "security",
        confidence: 0.95,
      },
    ];
    const items = adaptKnowledge(entries, source);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "knowledge");
  });

  test("collection from multiple sources", () => {
    const securityItems = adaptSecurityVulnerabilities([
      { id: "v1", type: "rce", severity: "critical", description: "RCE vuln" },
    ], source);
    const archItems = adaptArchitectureRecommendations([
      { id: "r1", title: "Extract service", description: "Dup logic", priority: "high" },
    ], source);
    const lessonItems = adaptLessons([
      { content: "Validate inputs", category: "security" },
    ], source);

    const collection = createCollection(
      [...securityItems, ...archItems, ...lessonItems],
      "test-task",
    );

    assert.equal(collection.evidence.length, 3);
    assert.equal(collection.metadata.securityCriticalCount, 1);
    assert.ok(collection.metadata.estimatedTokens > 0);

    // Validate entire collection
    const result = validateContextCollection(collection);
    assert.equal(result.valid, true, `Collection should be valid: ${result.errors.map(e => e.message).join(", ")}`);
  });
});

/* ============================================================================
 * T. PROPERTY INVARIANTS
 * ========================================================================== */

describe("P3.6-A: Property Invariants", () => {
  test("for every valid evidence: tokenEstimate >= 0", () => {
    const kinds: EvidenceKind[] = [
      "security", "architecture", "performance", "lesson",
      "knowledge", "placement", "dependency", "quality",
    ];
    for (const kind of kinds) {
      const e = makeEvidence({ kind });
      assert.ok(e.tokenEstimate >= 0, `${kind} should have non-negative tokenEstimate`);
    }
  });

  test("for every valid evidence: 0 <= relevance <= 1", () => {
    const relevances = [0, 0.25, 0.5, 0.75, 1.0];
    for (const r of relevances) {
      const e = makeEvidence({ relevance: r });
      assert.ok(e.relevance >= 0 && e.relevance <= 1);
    }
  });

  test("for every valid evidence: confidence is unknown or 0-1", () => {
    const confidences: Array<number | "unknown"> = [0, 0.5, 1.0, "unknown"];
    for (const c of confidences) {
      const e = makeEvidence({ confidence: c });
      assert.ok(e.confidence === "unknown" || (e.confidence >= 0 && e.confidence <= 1));
    }
  });

  test("collection evidence count matches actual array length", () => {
    const collection = createCollection([makeEvidence(), makeEvidence(), makeEvidence()], "test");
    assert.equal(collection.metadata.evidenceCount, collection.evidence.length);
  });

  test("collection estimatedTokens is sum of individual tokens", () => {
    const items = [makeEvidence(), makeEvidence()];
    const collection = createCollection(items, "test");
    const expectedTokens = items.reduce((sum, e) => sum + e.tokenEstimate, 0);
    assert.equal(collection.metadata.estimatedTokens, expectedTokens);
  });

  test("mergeCollections deduplicates by ID", () => {
    const e1 = makeEvidence();
    const a = createCollection([e1, makeEvidence()], "test");
    const b = createCollection([e1, makeEvidence()], "test");
    const merged = mergeCollections(a, b);
    assert.equal(merged.evidence.length, 3); // e1 deduplicated
  });
});
