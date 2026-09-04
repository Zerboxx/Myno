/**
 * P3.6-REMEDIATION — Deterministic Security-Evidence Policy
 *
 * BLOCKER #22 implementation. The prior runtime treated "no valid
 * security-critical evidence in context" as a warning-only condition
 * (guard.ts) and swallowed pipeline/lifecycle failures in broad catch
 * blocks, so a context with zero security evidence could still reach the
 * model.
 *
 * Contract (deterministic, no implicit heuristic, not universal):
 *
 *   securityEvidenceRequired =
 *     expectedSecurityCriticalCount > 0 || securityCollectionFailed
 *
 *   securityEvidencePresent =
 *     valid security-critical evidence actually selected into the
 *     assembled context (the model-visible instruction assembly)
 *
 *   NO VALID SECURITY-CRITICAL EVIDENCE = HARD CONTEXT ACTIVATION
 *   FAILURE for any context that is security-required. "Required" is
 *   derived ONLY from evidence that was actually collected + validated
 *   (plus any designated security collector that failed), never from
 *   keyword heuristics or task-domain strings.
 *
 * This module holds the single deterministic classification and the
 * security-designated collector set, so every enforcement point
 * (pipeline metrics, lifecycle assembly, guard, activation, agent
 * fail-closed gate) agrees on the same numbers.
 */

import type { ContextEvidence } from "../types.js";

/**
 * Collectors whose failure must deterministically mark the context
 * security-required (fail closed). The intelligence collector owns the
 * security-engine evidence in this project.
 */
export const SECURITY_COLLECTOR_IDS: ReadonlySet<string> = new Set([
  "intelligence-collector",
]);

/**
 * Deterministic classification of a security-critical evidence item.
 * A rejected/invalid item is NEVER security present, so validation
 * rejection cannot smuggle a bad item into "present".
 */
export function isSecurityCriticalEvidence(
  evidence: ContextEvidence,
): boolean {
  return evidence.securityClassification === "security-critical";
}

/**
 * Count VALID security-critical items. Invalid/expired/superseded items
 * do not contribute to "present" but are still counted as "expected"
 * when an invalid count is supplied (validation rejection also fails
 * closed).
 */
export function countSecurityCriticalEvidence(
  evidence: ContextEvidence[],
): number {
  return evidence.filter(e => isSecurityCriticalEvidence(e) && e.status === "valid").length;
}

/**
 * Count security-critical items rejected during validation. The input is
 * the pipeline's invalid-evidence list (schema-rejected), so every item
 * here failed validation and must never count toward "present" — and
 * each one still increments the expected count (validation rejection is
 * a fail-closed condition).
 */
export function countInvalidSecurityCriticalEvidence(
  evidence: ContextEvidence[],
): number {
  return evidence.filter(isSecurityCriticalEvidence).length;
}

export interface SecurityEvidenceExpectation {
  /**
   * How many valid security-critical items the task expects, based on
   * the pre-freshness collected pool (authoritative), plus rejected
   * invalid ones.
   */
  expectedCount: number;
  /** True when the context MUST contain valid security-critical evidence. */
  required: boolean;
  /** True when valid security-critical evidence reached the context. */
  present: boolean;
}

/**
 * Compute the deterministic security expectation for a context.
 *
 * `fullCollectedEvidence` is the authoritative pre-freshness pool for
 * the task (what the pipeline actually collected/validated). `assembled`
 * is the evidence that actually survived validation/selection/trust
 * filtering into the assembly. `securityCollectionFailed` permanently
 * marks the context security-required even on later refreshes, so a
 * collector failure is never silently "repaired" back to not-required.
 */
export function computeSecurityEvidenceExpectation(input: {
  fullCollectedEvidence: ContextEvidence[];
  assembled: ContextEvidence[];
  securityCollectionFailed?: boolean;
  invalidSecurityCriticalCount?: number;
}): SecurityEvidenceExpectation {
  const expectedCount =
    countSecurityCriticalEvidence(input.fullCollectedEvidence) +
    (input.invalidSecurityCriticalCount ?? 0);
  const required =
    expectedCount > 0 || (input.securityCollectionFailed ?? false);
  const present = countSecurityCriticalEvidence(input.assembled) > 0;
  return { expectedCount, required, present };
}

/**
 * True when a collector failure must mark the context security-required.
 * Only failures of security-designated collectors count — unrelated
 * collector failures are already visible in pipeline metrics but must
 * not poison a security-healthy context.
 */
export function isSecurityCollectorFailure(collectorId: string): boolean {
  return SECURITY_COLLECTOR_IDS.has(collectorId);
}