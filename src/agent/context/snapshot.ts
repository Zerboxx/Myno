/**
 * P3.6-B — Context Snapshots
 *
 * Immutable snapshots that record exactly which context was used.
 * Snapshots reference evidence IDs — they do NOT duplicate full evidence.
 */

import type { ContextEvidenceId, ContextCollectionMetadata } from "./types.js";

/* ============================================================================
 * SNAPSHOT TYPES
 * ========================================================================== */

export interface ContextSnapshot {
  /** Unique snapshot identifier */
  snapshotId: string;
  /** Collection this snapshot was taken from */
  collectionId: string;
  /** When the snapshot was created */
  createdAt: number;
  /** Project fingerprint at snapshot time */
  projectFingerprint: string;
  /** IDs of evidence items in the snapshot (immutable reference) */
  evidenceIds: ContextEvidenceId[];
  /** Metadata about the collection at snapshot time */
  metadata: ContextCollectionMetadata;
  /** Pipeline stage metadata */
  pipelineMetrics: {
    totalEvidence: number;
    validEvidence: number;
    invalidEvidence: number;
    duplicateGroups: number;
    staleEvidenceCount: number;
    collectorFailures: string[];
    collectionDurationMs: number;
  };
}

/* ============================================================================
 * SNAPSHOT CREATION
 * ========================================================================== */

let snapshotCounter = 0;

export function createSnapshot(input: {
  collectionId: string;
  projectFingerprint: string;
  evidenceIds: ContextEvidenceId[];
  metadata: ContextCollectionMetadata;
  pipelineMetrics: ContextSnapshot["pipelineMetrics"];
}): ContextSnapshot {
  snapshotCounter++;
  return {
    snapshotId: `snap-${Date.now()}-${snapshotCounter}`,
    collectionId: input.collectionId,
    createdAt: Date.now(),
    projectFingerprint: input.projectFingerprint,
    evidenceIds: Object.freeze([...input.evidenceIds]) as ContextEvidenceId[],
    metadata: input.metadata,
    pipelineMetrics: { ...input.pipelineMetrics },
  };
}

/**
 * Verify that a snapshot is immutable (evidence IDs cannot be modified).
 */
export function isSnapshotImmutable(snapshot: ContextSnapshot): boolean {
  try {
    (snapshot.evidenceIds as ContextEvidenceId[]).push("injected");
    return false;
  } catch {
    return true;
  }
}
