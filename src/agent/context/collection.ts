/**
 * P3.6-A — Context Collection
 *
 * Canonical collection type with metadata and operations.
 * The unit that flows through the P3.6 pipeline.
 */

import type {
  ContextCollection,
  ContextCollectionMetadata,
  ContextEvidence,
  SourceType,
  EvidenceKind,
  SecurityClassification,
  CONTEXT_SCHEMA_VERSION,
} from "./types.js";
import { CONTEXT_SCHEMA_VERSION as SCHEMA_VERSION } from "./types.js";

/* ============================================================================
 * COLLECTION CONSTRUCTION
 * ========================================================================== */

/**
 * Create a ContextCollection from evidence items.
 * Computes metadata automatically.
 */
export function createCollection(
  evidence: ContextEvidence[],
  taskId: string,
): ContextCollection {
  const metadata = computeMetadata(evidence, taskId);
  return { evidence, metadata };
}

/**
 * Compute collection metadata from evidence items.
 */
export function computeMetadata(
  evidence: ContextEvidence[],
  taskId: string,
): ContextCollectionMetadata {
  const sourceTypeCounts: Record<SourceType, number> = {} as any;
  const kindCounts: Record<EvidenceKind, number> = {} as any;

  let estimatedTokens = 0;
  let securityCriticalCount = 0;

  for (const item of evidence) {
    // Count source types
    sourceTypeCounts[item.source.sourceType] = (sourceTypeCounts[item.source.sourceType] ?? 0) + 1;

    // Count evidence kinds
    kindCounts[item.kind] = (kindCounts[item.kind] ?? 0) + 1;

    // Sum tokens
    estimatedTokens += item.tokenEstimate;

    // Count security-critical
    if (item.securityClassification === "security-critical") {
      securityCriticalCount++;
    }
  }

  return {
    taskId,
    createdAt: Date.now(),
    evidenceCount: evidence.length,
    estimatedTokens,
    securityCriticalCount,
    sourceTypeCounts,
    kindCounts,
    schemaVersion: SCHEMA_VERSION,
  };
}

/* ============================================================================
 * COLLECTION OPERATIONS
 * ========================================================================== */

/**
 * Add evidence to a collection (returns new collection, does not mutate).
 */
export function addEvidence(
  collection: ContextCollection,
  ...items: ContextEvidence[]
): ContextCollection {
  const newEvidence = [...collection.evidence, ...items];
  return createCollection(newEvidence, collection.metadata.taskId);
}

/**
 * Remove evidence by ID (returns new collection, does not mutate).
 */
export function removeEvidence(
  collection: ContextCollection,
  ...ids: string[]
): ContextCollection {
  const idSet = new Set(ids);
  const newEvidence = collection.evidence.filter(e => !idSet.has(e.id));
  return createCollection(newEvidence, collection.metadata.taskId);
}

/**
 * Filter evidence by predicate (returns new collection).
 */
export function filterEvidence(
  collection: ContextCollection,
  predicate: (e: ContextEvidence) => boolean,
): ContextCollection {
  return createCollection(collection.evidence.filter(predicate), collection.metadata.taskId);
}

/**
 * Sort evidence by a comparator (returns new collection, stable sort).
 */
export function sortEvidence(
  collection: ContextCollection,
  comparator: (a: ContextEvidence, b: ContextEvidence) => number,
): ContextCollection {
  const sorted = [...collection.evidence].sort(comparator);
  return createCollection(sorted, collection.metadata.taskId);
}

/**
 * Get all evidence matching a kind.
 */
export function getByKind(
  collection: ContextCollection,
  kind: EvidenceKind,
): ContextEvidence[] {
  return collection.evidence.filter(e => e.kind === kind);
}

/**
 * Get all security-critical evidence.
 */
export function getSecurityCritical(
  collection: ContextCollection,
): ContextEvidence[] {
  return collection.evidence.filter(e => e.securityClassification === "security-critical");
}

/**
 * Get total estimated tokens.
 */
export function getTotalTokens(collection: ContextCollection): number {
  return collection.metadata.estimatedTokens;
}

/**
 * Get evidence count.
 */
export function getEvidenceCount(collection: ContextCollection): number {
  return collection.evidence.length;
}

/**
 * Check if collection contains any security-critical evidence.
 */
export function hasSecurityCritical(collection: ContextCollection): boolean {
  return collection.metadata.securityCriticalCount > 0;
}

/**
 * Merge two collections (returns new collection, does not mutate either).
 */
export function mergeCollections(
  a: ContextCollection,
  b: ContextCollection,
): ContextCollection {
  // Deduplicate by ID
  const seen = new Set<string>();
  const merged: ContextEvidence[] = [];
  for (const item of [...a.evidence, ...b.evidence]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return createCollection(merged, a.metadata.taskId);
}

/**
 * Deduplicate evidence by deduplicationKey.
 * Keeps the first occurrence (highest priority by insertion order).
 */
export function deduplicateByKey(
  collection: ContextCollection,
): ContextCollection {
  const seen = new Set<string>();
  const deduped: ContextEvidence[] = [];
  for (const item of collection.evidence) {
    if (!seen.has(item.deduplicationKey)) {
      seen.add(item.deduplicationKey);
      deduped.push(item);
    }
  }
  return createCollection(deduped, collection.metadata.taskId);
}

/**
 * Get deduplication groups — evidence items sharing the same dedup key.
 */
export function getDeduplicationGroups(
  collection: ContextCollection,
): Map<string, ContextEvidence[]> {
  const groups = new Map<string, ContextEvidence[]>();
  for (const item of collection.evidence) {
    const existing = groups.get(item.deduplicationKey) ?? [];
    existing.push(item);
    groups.set(item.deduplicationKey, existing);
  }
  return groups;
}
