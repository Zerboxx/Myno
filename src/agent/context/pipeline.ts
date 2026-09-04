/**
 * P3.6-B — Context Collection Pipeline
 *
 * The central orchestrator that collects, normalizes, validates,
 * deduplicates, evaluates freshness, prioritizes, and snapshots evidence.
 *
 * Pipeline:
 *   collect → normalize → validate → provenance → deduplicate →
 *   freshness → prioritize → snapshot → ContextCollection
 */

import type {
  ContextEvidence,
  ContextCollection,
  ContextCollectionMetadata,
} from "./types.js";
import { createCollection, computeMetadata, deduplicateByKey, getDeduplicationGroups } from "./collection.js";
import { validateContextEvidence } from "./validation.js";
import type { ContextCollector, ContextCollectionRequest, CollectorResult } from "./collectors/collectors.js";
import { ALL_COLLECTORS } from "./collectors/collectors.js";
import { evaluateFreshness } from "./freshness.js";
import { computePriority, assignPriority } from "./prioritization.js";
import { createSnapshot, type ContextSnapshot } from "./snapshot.js";
import {
  countInvalidSecurityCriticalEvidence,
  countSecurityCriticalEvidence,
  isSecurityCollectorFailure,
} from "./runtime/security-evidence-policy.js";

/* ============================================================================
 * PIPELINE TYPES
 * ========================================================================== */

export interface PipelineResult {
  collection: ContextCollection;
  snapshot: ContextSnapshot;
  metrics: PipelineMetrics;
}

export interface PipelineMetrics {
  totalEvidence: number;
  validEvidence: number;
  invalidEvidence: number;
  duplicateGroups: number;
  staleEvidenceCount: number;
  collectorFailures: string[];
  collectorResults: CollectorResult[];
  collectionDurationMs: number;
  validationDurationMs: number;
  dedupDurationMs: number;
  freshnessDurationMs: number;
  prioritizationDurationMs: number;
  totalDurationMs: number;
  /**
   * Deterministic security-evidence policy (BLOCKER #22). Expected =
   * count of VALID security-critical evidence in the pipelined
   * collection + invalid security-critical items rejected during
   * validation. securityCollectionFailed = any security-designated
   * collector failed. These drive the fail-closed activation gate —
   * derived from actual pipeline outcome, never from heuristics.
   */
  expectedSecurityCriticalCount?: number;
  invalidSecurityCriticalCount?: number;
  securityCollectionFailed?: boolean;
}

/* ============================================================================
 * PIPELINE
 * ========================================================================== */

export interface ContextPipelineOptions {
  /** Custom collectors to use (defaults to ALL_COLLECTORS) */
  collectors?: ContextCollector[];
  /** Project fingerprint for change detection */
  projectFingerprint?: string;
}

/**
 * Execute the full context collection pipeline.
 *
 * 1. Collect from all collectors (parallel, failure-isolated)
 * 2. Validate each evidence item
 * 3. Evaluate freshness
 * 4. Assign priority
 * 5. Deduplicate
 * 6. Create collection
 * 7. Create snapshot
 */
export async function executePipeline(
  request: ContextCollectionRequest,
  options: ContextPipelineOptions = {},
): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  const collectors = options.collectors ?? ALL_COLLECTORS;

  // ── Phase 1: Collection ──────────────────────────────────────
  const collectionStart = Date.now();
  const collectorResults = await collectAll(collectors, request);
  const allEvidence = collectorResults.flatMap(r => r.evidence);
  const collectionDuration = Date.now() - collectionStart;

  // ── Phase 2: Validation ──────────────────────────────────────
  const validationStart = Date.now();
  const { valid: validEvidence, invalid: invalidEvidence } = validateAll(allEvidence);
  const validationDuration = Date.now() - validationStart;

  // ── Phase 3: Freshness ───────────────────────────────────────
  const freshnessStart = Date.now();
  const projectFingerprintChanged = options.projectFingerprint !== undefined &&
    request.previousFingerprint !== undefined &&
    options.projectFingerprint !== request.previousFingerprint;
  const { evidence: freshEvidence, staleCount } = evaluateFreshness(
    validEvidence,
    projectFingerprintChanged,
    request.previousFingerprint,
    options.projectFingerprint,
  );
  const freshnessDuration = Date.now() - freshnessStart;

  // ── Phase 4: Priority ────────────────────────────────────────
  const prioritizationStart = Date.now();
  const prioritizedEvidence = freshEvidence.map(assignPriority);
  const prioritizationDuration = Date.now() - prioritizationStart;

  // ── Phase 5: Deduplication ───────────────────────────────────
  const dedupStart = Date.now();
  const deduped = deduplicateByKey(createCollection(prioritizedEvidence, request.taskId));
  const dedupGroups = getDeduplicationGroups(createCollection(prioritizedEvidence, request.taskId));
  const duplicateGroups = dedupGroups.size;
  const dedupDuration = Date.now() - dedupStart;

  // ── Phase 6: Final Collection ────────────────────────────────
  const collection = createCollection(deduped.evidence, request.taskId);

  // ── Phase 7: Snapshot ────────────────────────────────────────
  const snapshot = createSnapshot({
    collectionId: `col-${request.taskId}`,
    projectFingerprint: options.projectFingerprint ?? "unknown",
    evidenceIds: collection.evidence.map(e => e.id),
    metadata: collection.metadata,
    pipelineMetrics: {
      totalEvidence: allEvidence.length,
      validEvidence: validEvidence.length,
      invalidEvidence: invalidEvidence.length,
      duplicateGroups,
      staleEvidenceCount: staleCount,
      collectorFailures: collectorResults.filter(r => !r.success).map(r => r.collectorId),
      collectionDurationMs: collectionDuration,
    },
  });

  // ── Metrics ──────────────────────────────────────────────────
  const totalDuration = Date.now() - pipelineStart;
  const metrics: PipelineMetrics = {
    totalEvidence: allEvidence.length,
    validEvidence: validEvidence.length,
    invalidEvidence: invalidEvidence.length,
    duplicateGroups,
    staleEvidenceCount: staleCount,
    collectorFailures: collectorResults.filter(r => !r.success).map(r => r.collectorId),
    collectorResults,
    collectionDurationMs: collectionDuration,
    validationDurationMs: validationDuration,
    dedupDurationMs: dedupDuration,
    freshnessDurationMs: freshnessDuration,
    prioritizationDurationMs: prioritizationDuration,
    totalDurationMs: totalDuration,
    expectedSecurityCriticalCount: countSecurityCriticalEvidence(collection.evidence),
    invalidSecurityCriticalCount: countInvalidSecurityCriticalEvidence(invalidEvidence),
    securityCollectionFailed: collectorResults.some(
      r => !r.success && isSecurityCollectorFailure(r.collectorId),
    ),
  };

  return { collection, snapshot, metrics };
}

/* ============================================================================
 * INTERNAL HELPERS
 * ========================================================================== */

/**
 * Run all collectors in parallel with failure isolation.
 */
async function collectAll(
  collectors: ContextCollector[],
  request: ContextCollectionRequest,
): Promise<CollectorResult[]> {
  const results = await Promise.all(
    collectors.map(collector =>
      collector.collect(request).catch((err: unknown) => ({
        evidence: [],
        collectorId: collector.id,
        durationMs: 0,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        itemCount: 0,
      }))
    ),
  );
  return results;
}

/**
 * Validate all evidence items.
 */
function validateAll(
  evidence: ContextEvidence[],
): { valid: ContextEvidence[]; invalid: ContextEvidence[] } {
  const valid: ContextEvidence[] = [];
  const invalid: ContextEvidence[] = [];

  for (const item of evidence) {
    const result = validateContextEvidence(item);
    if (result.valid) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  }

  return { valid, invalid };
}
