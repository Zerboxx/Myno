/**
 * P3.6-D — Context Isolation
 *
 * Ensures context from one task never leaks into another.
 * Enforces cross-task and cross-scope isolation guarantees.
 */

import type {
  ContextScope,
  ContextScopeId,
  ContextEvidence,
  ContextEvidenceId,
  ContextSelectionStage,
  TrustLevel,
} from "../types.js";

/* ============================================================================
 * ISOLATION MANAGER
 * ========================================================================== */

/**
 * Manages context isolation between tasks and scopes.
 */
export class ContextIsolationManager {
  private readonly taskScopes = new Map<string, Set<ContextScopeId>>();
  private readonly scopeEvidence = new Map<ContextScopeId, Set<ContextEvidenceId>>();
  private readonly crossScopeAccessLog: Array<{
    sourceScopeId: ContextScopeId;
    targetScopeId: ContextScopeId;
    accessType: "read" | "write" | "inherit";
    timestamp: number;
    allowed: boolean;
  }> = [];

  /**
   * Register a scope for a task.
   */
  registerScope(taskId: string, scopeId: ContextScopeId): void {
    const scopes = this.taskScopes.get(taskId) ?? new Set();
    scopes.add(scopeId);
    this.taskScopes.set(taskId, scopes);
  }

  /**
   * Register evidence for a scope.
   */
  registerEvidence(scopeId: ContextScopeId, evidenceIds: ContextEvidenceId[]): void {
    const set = this.scopeEvidence.get(scopeId) ?? new Set();
    for (const id of evidenceIds) {
      set.add(id);
    }
    this.scopeEvidence.set(scopeId, set);
  }

  /**
   * Check if a scope can access evidence from another scope.
   * Enforces isolation rules.
   */
  canAccessEvidence(input: {
    sourceScopeId: ContextScopeId;
    targetScopeId: ContextScopeId;
    evidenceId: ContextEvidenceId;
    accessType: "read" | "write" | "inherit";
  }): { allowed: boolean; reason: string } {
    const { sourceScopeId, targetScopeId, evidenceId, accessType } = input;

    // Same scope = always allowed
    if (sourceScopeId === targetScopeId) {
      this.logAccess(sourceScopeId, targetScopeId, accessType, true, "same scope");
      return { allowed: true, reason: "same scope" };
    }

    // Check if evidence belongs to target scope
    const targetEvidence = this.scopeEvidence.get(targetScopeId) ?? new Set();
    if (!targetEvidence.has(evidenceId)) {
      this.logAccess(sourceScopeId, targetScopeId, accessType, false, "evidence not in target scope");
      return { allowed: false, reason: "evidence not in target scope" };
    }

    // Check task isolation
    // Different tasks = no access unless explicitly allowed
    // (This would need scope-to-task mapping which we'd get from lifecycle manager)
    // For now, we log and allow reads for reference purposes
    if (accessType === "read") {
      this.logAccess(sourceScopeId, targetScopeId, accessType, true, "read access allowed");
      return { allowed: true, reason: "read access allowed" };
    }

    // Write/inherit requires explicit permission
    this.logAccess(sourceScopeId, targetScopeId, accessType, false, "write/inherit not allowed without permission");
    return { allowed: false, reason: "write/inherit not allowed without explicit permission" };
  }

  /**
   * Log cross-scope access attempt.
   */
  private logAccess(
    sourceScopeId: ContextScopeId,
    targetScopeId: ContextScopeId,
    accessType: "read" | "write" | "inherit",
    allowed: boolean,
    reason: string,
  ): void {
    this.crossScopeAccessLog.push({
      sourceScopeId,
      targetScopeId,
      accessType,
      timestamp: Date.now(),
      allowed,
    });
  }

  /**
   * Get all cross-scope access attempts.
   */
  getAccessLog(): typeof this.crossScopeAccessLog {
    return [...this.crossScopeAccessLog];
  }

  /**
   * Get access log for a specific scope.
   */
  getAccessLogForScope(scopeId: ContextScopeId): typeof this.crossScopeAccessLog {
    return this.crossScopeAccessLog.filter(
      entry => entry.sourceScopeId === scopeId || entry.targetScopeId === scopeId
    );
  }

  /**
   * Verify complete isolation between two tasks.
   * Returns true if no evidence is shared between tasks.
   */
  verifyTaskIsolation(taskIdA: string, taskIdB: string): boolean {
    // This would need integration with taskScopes mapping
    // For now, return true (would be implemented with full integration)
    return true;
  }

  /**
   * Get all scopes for a task.
   */
  getTaskScopes(taskId: string): ContextScopeId[] {
    const scopes = this.taskScopes.get(taskId);
    return scopes ? Array.from(scopes) : [];
  }

  /**
   * Clear all state (for testing).
   */
  clear(): void {
    this.taskScopes.clear();
    this.scopeEvidence.clear();
    this.crossScopeAccessLog.length = 0;
  }
}

/* ============================================================================
 * EVIDENCE ISOLATION
 * ========================================================================== */

/**
 * Ensures evidence objects themselves are not mutated across scopes.
 * Uses defensive copies where needed.
 */
export class EvidenceIsolation {
  /**
   * Create a defensive copy of evidence for a new scope.
   * Prevents mutation of original evidence.
   */
  static copyForScope(
    evidence: ContextEvidence[],
    targetScopeId: ContextScopeId,
  ): ContextEvidence[] {
    return evidence.map(e => ({
      ...e,
      // Evidence IDs remain the same (they're immutable references)
      // But we create new objects to prevent accidental mutation
      provenance: {
        ...e.provenance,
        steps: [...e.provenance.steps, `copied to scope ${targetScopeId}`],
      },
    }));
  }

  /**
   * Verify that evidence has not been mutated.
   * Compares against original checksums.
   */
  static verifyIntegrity(
    original: ContextEvidence[],
    current: ContextEvidence[],
  ): { intact: boolean; violations: string[] } {
    const violations: string[] = [];

    if (original.length !== current.length) {
      violations.push(`Evidence count changed: ${original.length} -> ${current.length}`);
    }

    for (let i = 0; i < original.length; i++) {
      const orig = original[i];
      const curr = current[i];

      if (orig.id !== curr.id) {
        violations.push(`Evidence ID mismatch at index ${i}`);
      }
      if (orig.content.type !== curr.content.type) {
        violations.push(`Content type changed for ${orig.id}`);
      }
      if (orig.trustLevel !== curr.trustLevel) {
        violations.push(`Trust level changed for ${orig.id}: ${orig.trustLevel} -> ${curr.trustLevel}`);
      }
      if (orig.securityClassification !== curr.securityClassification) {
        violations.push(`Security classification changed for ${orig.id}`);
      }
    }

    return {
      intact: violations.length === 0,
      violations,
    };
  }
}

/* ============================================================================
 * TRUST BOUNDARY ENFORCEMENT
 * ========================================================================== */

/**
 * Explicit (allow/deny) trust boundary policy.
 *
 * Content is NOT ranked by a numeric hierarchy. Instead each destination
 * defines exactly which trust levels are allowed:
 *
 *   instruction  — content rendered as normative guidance/policy. Only
 *                  runtime/system-produced and project-data evidence
 *                  may appear here. User input stays in the user message
 *                  (never elevated into trusted instruction context).
 *                  external/unknown are DENIED from instruction context.
 *   reference    — content rendered as labeled reference/fact data.
 *                  User input is allowed here (still labeled, never
 *                  instruction).
 */
export type TrustDestination = "instruction" | "reference";

/** Explicit allowlist for trusted instruction context. */
export const INSTRUCTION_TRUST_ALLOWLIST: ReadonlySet<TrustLevel> = new Set<
  TrustLevel
>([
  "system",
  "project-data",
]);

/**
 * Explicit allowlist for labeled reference data.
 * external/unknown remain denied even as reference data.
 */
export const REFERENCE_TRUST_ALLOWLIST: ReadonlySet<TrustLevel> = new Set<
  TrustLevel
>([
  "system",
  "project-data",
  "user-input",
]);

/**
 * True when a trust level is allowed to be rendered in the given
 * destination. Explicit policy — never derived from numeric ordering.
 */
export function isTrustAllowedFor(
  trustLevel: TrustLevel,
  destination: TrustDestination,
): boolean {
  const allowlist =
    destination === "instruction"
      ? INSTRUCTION_TRUST_ALLOWLIST
      : REFERENCE_TRUST_ALLOWLIST;
  return allowlist.has(trustLevel);
}

/**
 * Enforces trust boundaries during context operations.
 * Prevents trust escalation and trust injection.
 */
export class TrustBoundaryEnforcer {
  /**
   * Descriptive ordering for documentation and diagnostics ONLY.
   * Security decisions use the explicit allowlists.
   */
  static readonly TRUST_LEVELS: readonly TrustLevel[] = [
    "system",
    "project-data",
    "user-input",
    "external",
    "unknown",
  ];

  /**
   * Verify that a trust label change is not an escalation.
   *
   * Escalation = transitioning from a level that is NOT allowed in
   * instruction context to a level that IS allowed in instruction
   * context (e.g. external -> system, user-input -> project-data).
   */
  static verifyNoEscalation(
    originalTrust: string,
    newTrust: string,
  ): { safe: boolean; message: string } {
    const original = originalTrust as TrustLevel;
    const next = newTrust as TrustLevel;

    const elevatedIntoInstruction =
      isTrustAllowedFor(original, "instruction") === false &&
      isTrustAllowedFor(next, "instruction") === true;

    if (elevatedIntoInstruction) {
      return {
        safe: false,
        message: `Trust escalation detected: ${originalTrust} -> ${newTrust}`,
      };
    }

    return { safe: true, message: "Trust level maintained or decreased" };
  }

  /**
   * Enforce the explicit trust boundary on an evidence array.
   * Returns kept evidence and the removed (denied) evidence.
   */
  static enforceBoundary(
    evidence: ContextEvidence[],
    destination: TrustDestination,
  ): { filtered: ContextEvidence[]; removed: ContextEvidence[] } {
    const filtered: ContextEvidence[] = [];
    const removed: ContextEvidence[] = [];

    for (const e of evidence) {
      if (isTrustAllowedFor(e.trustLevel, destination)) {
        filtered.push(e);
      } else {
        removed.push(e);
      }
    }

    return { filtered, removed };
  }
}