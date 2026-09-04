/**
 * P3.6-B — Provenance Tracking
 *
 * Tracks where evidence came from, how it was produced,
 * and what it was derived from. Enables full audit trail.
 */

import type { ContextEvidence, ContextEvidenceId, ProvenanceChain } from "./types.js";

/* ============================================================================
 * PROVENANCE BUILDER
 * ========================================================================== */

const MAX_DERIVATION_DEPTH = 10;

export interface ProvenanceBuilderInput {
  collectorId: string;
  engineId?: string;
  projectFingerprint?: string;
  taskId: string;
  parentEvidenceIds?: ContextEvidenceId[];
}

/**
 * Build a ProvenanceChain for newly collected evidence.
 */
export function buildProvenance(input: ProvenanceBuilderInput): ProvenanceChain {
  const steps: string[] = [`collected by ${input.collectorId}`];
  if (input.engineId) steps.push(`engine: ${input.engineId}`);
  if (input.projectFingerprint) steps.push(`project-fingerprint: ${input.projectFingerprint.slice(0, 12)}`);

  return {
    derivedFrom: input.parentEvidenceIds ?? [],
    steps,
  };
}

/**
 * Build provenance for derived evidence (combining multiple parents).
 */
export function buildDerivedProvenance(
  parents: ContextEvidence[],
  collectorId: string,
  derivationStep: string,
): ProvenanceChain | null {
  if (parents.length === 0) return null;

  const parentIds: ContextEvidenceId[] = [];
  const steps: string[] = [];
  let maxDepth = 0;

  for (const parent of parents) {
    parentIds.push(parent.id);
    const depth = getProvenanceDepth(parent.provenance);
    if (depth > maxDepth) maxDepth = depth;
  }

  if (maxDepth >= MAX_DERIVATION_DEPTH) {
    return null;
  }

  steps.push(`derived by ${collectorId}: ${derivationStep}`);

  return {
    derivedFrom: parentIds,
    steps,
  };
}

/* ============================================================================
 * PROVENANCE ANALYSIS
 * ========================================================================== */

/**
 * Get the depth of a provenance chain (how many derivation steps).
 */
export function getProvenanceDepth(provenance: ProvenanceChain): number {
  return provenance.derivedFrom.length > 0 ? provenance.steps.length : 0;
}

/**
 * Check if a provenance chain would create a cycle if a new parent were added.
 */
export function wouldCreateCycle(
  existingEvidence: Map<ContextEvidenceId, ContextEvidence>,
  newParentId: ContextEvidenceId,
  candidateChildId: ContextEvidenceId,
): boolean {
  if (newParentId === candidateChildId) return true;

  const visited = new Set<ContextEvidenceId>();
  const stack = [newParentId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === candidateChildId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const evidence = existingEvidence.get(current);
    if (evidence) {
      for (const parentId of evidence.provenance.derivedFrom) {
        stack.push(parentId);
      }
    }
  }

  return false;
}

/**
 * Validate that a provenance chain has no cycles.
 */
export function hasCycle(provenance: ProvenanceChain): boolean {
  const visited = new Set<ContextEvidenceId>();
  for (const id of provenance.derivedFrom) {
    if (visited.has(id)) return true;
    visited.add(id);
  }
  return false;
}

/**
 * Validate that parent evidence IDs exist in a known evidence map.
 */
export function validateParentEvidence(
  provenance: ProvenanceChain,
  knownEvidence: Map<ContextEvidenceId, ContextEvidence>,
): { valid: boolean; missingIds: ContextEvidenceId[] } {
  const missingIds: ContextEvidenceId[] = [];
  for (const parentId of provenance.derivedFrom) {
    if (!knownEvidence.has(parentId)) {
      missingIds.push(parentId);
    }
  }
  return { valid: missingIds.length === 0, missingIds };
}

/**
 * Check if adding a parent would exceed max derivation depth.
 */
export function wouldExceedMaxDepth(
  parentProvenance: ProvenanceChain,
  currentDepth: number = 0,
): boolean {
  const parentDepth = getProvenanceDepth(parentProvenance);
  return (currentDepth + parentDepth + 1) > MAX_DERIVATION_DEPTH;
}
