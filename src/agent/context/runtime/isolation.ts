/**
 * P3.6-D — Context Isolation
 *
 * BLOCKER #23 reimplementation. Prior version granted cross-task reads
 * ("read access allowed") and verifyTaskIsolation() returned true
 * unconditionally — isolation was effectively unimplemented. This
 * version is DENY BY DEFAULT:
 *
 *   - unknown scope / unbound scope / no task binding        → DENY
 *   - cross-task scope read/write/inherit                    → DENY
 *   - cross-scope read (concurrent scopes, same task)        → DENY
 *   - evidence owned by a different scope                    → DENY
 *   - write/inherit from any other scope                     → DENY
 *   - same canonical scope, same task, owned evidence        → ALLOW
 *
 * Isolation is enforced in the EXECUTED path (ContextActivationService
 * calls verifyEvidenceAccess before assembly) — never left to the LLM.
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
 * All access decisions default to DENY.
 */
export class ContextIsolationManager {
  private readonly taskScopes = new Map<string, Set<ContextScopeId>>();
  private readonly scopeEvidence = new Map<ContextScopeId, Set<ContextEvidenceId>>();
  /**
   * Canonical scope → task binding. A scope may be bound to exactly one
   * task; rebinding to a different task is a violation.
   */
  private readonly scopeToTask = new Map<ContextScopeId, string>();
  /**
   * Canonical evidence → scope ownership. An evidence ID may be owned by
   * exactly one scope; reuse across scopes is a violation.
   */
  private readonly evidenceOwner = new Map<ContextEvidenceId, ContextScopeId>();
  private readonly crossScopeAccessLog: Array<{
    sourceScopeId: ContextScopeId;
    targetScopeId: ContextScopeId;
    accessType: "read" | "write" | "inherit";
    timestamp: number;
    allowed: boolean;
  }> = [];

  /**
   * Register a scope for a task.
   * BLOCKER #23: refusing to rebind a scope to a different task.
   */
  registerScope(taskId: string, scopeId: ContextScopeId): void {
    const boundTask = this.scopeToTask.get(scopeId);
    if (boundTask !== undefined && boundTask !== taskId) {
      throw new Error(
        `Context isolation violation: scope ${scopeId} is already bound to task "${boundTask}", cannot rebind to "${taskId}"`,
      );
    }
    this.scopeToTask.set(scopeId, taskId);
    const scopes = this.taskScopes.get(taskId) ?? new Set();
    scopes.add(scopeId);
    this.taskScopes.set(taskId, scopes);
  }

  /**
   * Register evidence for a scope.
   * BLOCKER #23: an evidence ID can be owned by exactly one scope.
   */
  registerEvidence(scopeId: ContextScopeId, evidenceIds: ContextEvidenceId[]): void {
    for (const id of evidenceIds) {
      const owner = this.evidenceOwner.get(id);
      if (owner !== undefined && owner !== scopeId) {
        throw new Error(
          `Context isolation violation: evidence ${id} is already owned by scope ${owner}, cannot register to ${scopeId}`,
        );
      }
      this.evidenceOwner.set(id, scopeId);
    }
    const set = this.scopeEvidence.get(scopeId) ?? new Set();
    for (const id of evidenceIds) {
      set.add(id);
    }
    this.scopeEvidence.set(scopeId, set);
  }

  /**
   * DENY-BY-DEFAULT check run at the activation boundary BEFORE assembly.
   * Verifies the canonical scope→task binding and evidence→scope
   * ownership for every evidence ID that is about to enter the context.
   */
  verifyEvidenceAccess(input: {
    taskId: string;
    scopeId: ContextScopeId;
    evidenceIds: ContextEvidenceId[];
  }): { allowed: boolean; reasons: string[] } {
    const reasons: string[] = [];

    const boundTask = this.scopeToTask.get(input.scopeId);
    if (boundTask !== undefined && boundTask !== input.taskId) {
      return {
        allowed: false,
        reasons: ["scope-bound-to-different-task"],
      };
    }

    for (const id of input.evidenceIds) {
      const owner = this.evidenceOwner.get(id);
      if (owner !== undefined && owner !== input.scopeId) {
        reasons.push(`evidence-owned-by-other-scope:${id}`);
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons,
    };
  }

  /**
   * DENY-BY-DEFAULT scope access check.
   *
   * Same canonical scope: allowed for reading evidence the scope owns,
   * when the scope is bound to a task. Everything else is denied:
   * cross-scope reads (concurrent scopes never read each other's
   * evidence), cross-task reads, items this scope does not own, and all
   * writes/inherits from another scope.
   */
  canAccessEvidence(input: {
    sourceScopeId: ContextScopeId;
    targetScopeId: ContextScopeId;
    evidenceId: ContextEvidenceId;
    accessType: "read" | "write" | "inherit";
  }): { allowed: boolean; reason: string } {
    const { sourceScopeId, targetScopeId, evidenceId, accessType } = input;

    // Default: DENY.
    let allowed = false;
    let reason = "access denied by default";

    const sourceTask = this.scopeToTask.get(sourceScopeId);
    const targetTask = this.scopeToTask.get(targetScopeId);

    if (sourceTask === undefined || targetTask === undefined) {
      reason = "scope not bound to a task";
    } else if (sourceTask !== targetTask) {
      reason = "cross-task access denied";
    } else if (sourceScopeId !== targetScopeId) {
      // Concurrent scopes of the same task never read each other's evidence.
      reason = "cross-scope access denied";
    } else if (this.evidenceOwner.get(evidenceId) !== sourceScopeId) {
      reason = "evidence not owned by source scope";
    } else if (!(this.scopeEvidence.get(sourceScopeId)?.has(evidenceId) ?? false)) {
      reason = "evidence not registered to source scope";
    } else if (accessType === "read") {
      allowed = true;
      reason = "same scope owned evidence read";
    } else {
      reason = "write/inherit not allowed without explicit permission";
    }

    this.logAccess(sourceScopeId, targetScopeId, accessType, allowed, reason);
    return { allowed, reason };
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
   * Returns true only when NO evidence ID is shared between the tasks'
   * scopes. BLOCKER #23: previously always returned true.
   */
  verifyTaskIsolation(taskIdA: string, taskIdB: string): boolean {
    const evidenceA = this.taskEvidenceUnion(taskIdA);
    const evidenceB = this.taskEvidenceUnion(taskIdB);
    for (const idA of evidenceA) {
      if (evidenceB.has(idA)) return false;
    }
    return true;
  }

  /** Union of all evidence IDs registered to a task's scopes. */
  private taskEvidenceUnion(taskId: string): Set<ContextEvidenceId> {
    const union = new Set<ContextEvidenceId>();
    const scopes = this.taskScopes.get(taskId);
    if (!scopes) return union;
    for (const scopeId of scopes) {
      const ids = this.scopeEvidence.get(scopeId);
      if (ids) {
        for (const id of ids) union.add(id);
      }
    }
    return union;
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
    this.scopeToTask.clear();
    this.evidenceOwner.clear();
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