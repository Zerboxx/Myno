/**
 * P3.6-D — Context Invalidation
 *
 * Explicit invalidation logic with security-critical handling.
 * Never silently invalidates context.
 */

import type {
  ContextScope,
  ContextScopeId,
  ContextInvalidationReason,
  ContextEvidence,
  ContextRefreshReason,
} from "../types.js";
import { isInvalidatedByMutation } from "../freshness.js";

/* ============================================================================
 * INVALIDATION MANAGER
 * ========================================================================== */

/**
 * Manages explicit context invalidation with full observability.
 */
export class ContextInvalidator {
  private readonly invalidationLog: Array<{
    scopeId: ContextScopeId;
    reason: ContextInvalidationReason;
    timestamp: number;
    evidenceCount: number;
    generation: number;
  }> = [];

  /**
   * Invalidate a context scope with explicit reason.
   * Returns the invalidation record.
   */
  invalidate(
    scope: ContextScope,
    reason: ContextInvalidationReason,
    evidenceCount: number,
  ): { success: boolean; record: any } {
    const record = {
      scopeId: scope.scopeId,
      reason,
      timestamp: Date.now(),
      evidenceCount,
      generation: scope.generation,
    };

    this.invalidationLog.push(record);

    return { success: true, record };
  }

  /**
   * Check if a scope should be invalidated based on project mutation.
   * Returns invalidation decision with reason.
   */
  checkMutationInvalidation(input: {
    scope: ContextScope;
    evidence: ContextEvidence[];
    beforeFingerprint: string;
    afterFingerprint: string;
    securityRelevantChange: boolean;
  }): { shouldInvalidate: boolean; reason?: ContextInvalidationReason; affectedKinds: string[] } {
    const { scope, evidence, beforeFingerprint, afterFingerprint, securityRelevantChange } = input;

    // Fingerprint unchanged = no invalidation needed
    if (beforeFingerprint === afterFingerprint) {
      return { shouldInvalidate: false, affectedKinds: [] };
    }

    // Find evidence that should be invalidated by mutation
    const affectedKinds = evidence
      .filter(e => isInvalidatedByMutation(e.kind))
      .map(e => e.kind);

    // Security-critical evidence requires special handling
    if (securityRelevantChange) {
      const securityAffected = evidence.filter(
        e => e.securityClassification === "security-critical" && isInvalidatedByMutation(e.kind)
      );
      if (securityAffected.length > 0) {
        return {
          shouldInvalidate: true,
          reason: "security-critical-change",
          affectedKinds: [...new Set([...affectedKinds, "security-critical"])],
        };
      }
    }

    // General mutation invalidation
    if (affectedKinds.length > 0) {
      return {
        shouldInvalidate: true,
        reason: "project-changed",
        affectedKinds,
      };
    }

    // Fingerprint changed but no mutation-sensitive evidence
    return { shouldInvalidate: false, affectedKinds: [] };
  }

  /**
   * Check if execution side effects require invalidation.
   */
  checkExecutionInvalidation(input: {
    scope: ContextScope;
    evidence: ContextEvidence[];
    modifiedPaths: string[];
    securityRelevantPaths: string[];
  }): { shouldInvalidate: boolean; reason?: ContextInvalidationReason; affectedKinds: string[] } {
    const { scope, evidence, modifiedPaths, securityRelevantPaths } = input;

    // Security-relevant paths modified
    if (securityRelevantPaths.length > 0) {
      const affectedKinds = evidence
        .filter(e => e.securityClassification === "security-critical")
        .map(e => e.kind);

      return {
        shouldInvalidate: true,
        reason: "security-critical-change",
        affectedKinds: [...new Set(affectedKinds)],
      };
    }

    // Check if modified paths affect existing evidence
    const affectedKinds: string[] = [];
    for (const path of modifiedPaths) {
      // Evidence kinds that could be affected by file modifications
      if (path.endsWith(".luau") || path.endsWith(".lua")) {
        affectedKinds.push("code", "architecture", "dependency", "placement");
      }
      if (path.includes("RemoteEvent") || path.includes("RemoteFunction")) {
        affectedKinds.push("remote-security", "security");
      }
    }

    if (affectedKinds.length > 0) {
      return {
        shouldInvalidate: true,
        reason: "execution-invalidated",
        affectedKinds: [...new Set(affectedKinds)],
      };
    }

    return { shouldInvalidate: false, affectedKinds: [] };
  }

  /**
   * Check if recovery invalidates context assumptions.
   */
  checkRecoveryInvalidation(input: {
    scope: ContextScope;
    evidence: ContextEvidence[];
    errorMessage: string;
    recoveryAction: string;
  }): { shouldInvalidate: boolean; reason?: ContextInvalidationReason; affectedKinds: string[] } {
    const { scope, evidence, errorMessage, recoveryAction } = input;

    // Recovery often changes assumptions
    const affectedKinds = evidence
      .filter(e =>
        e.kind === "failure-pattern" ||
        e.kind === "lesson" ||
        e.kind === "runtime-error" ||
        e.kind === "observation"
      )
      .map(e => e.kind);

    if (affectedKinds.length > 0) {
      return {
        shouldInvalidate: true,
        reason: "recovery-invalidated",
        affectedKinds: [...new Set(affectedKinds)],
      };
    }

    return { shouldInvalidate: false, affectedKinds: [] };
  }

  /**
   * Get all invalidation records for a scope.
   */
  getInvalidationHistory(scopeId: string): Array<{
    scopeId: ContextScopeId;
    reason: ContextInvalidationReason;
    timestamp: number;
    evidenceCount: number;
    generation: number;
  }> {
    return this.invalidationLog.filter(r => r.scopeId === scopeId);
  }

  /**
   * Get all invalidation records.
   */
  getAllInvalidations(): typeof this.invalidationLog {
    return [...this.invalidationLog];
  }

  /**
   * Clear invalidation log (for testing).
   */
  clear(): void {
    this.invalidationLog.length = 0;
  }
}

/* ============================================================================
 * SECURITY-CRITICAL INVALIDATION
 * ========================================================================== */

/**
 * Specialized handling for security-critical evidence invalidation.
 * Security evidence requires targeted refresh, not blind full refresh.
 */
export class SecurityContextInvalidator {
  /**
   * Identify security-critical evidence that needs refresh after mutation.
   */
  identifySecurityEvidenceToRefresh(evidence: ContextEvidence[]): ContextEvidence[] {
    return evidence.filter(e =>
      e.securityClassification === "security-critical" &&
      (e.kind === "security" ||
        e.kind === "remote-security" ||
        e.kind === "dependency" ||
        e.kind === "architecture")
    );
  }

  /**
   * Determine if a mutation is security-relevant.
   */
  isSecurityRelevantMutation(modifiedPaths: string[]): boolean {
    const securityPatterns = [
      /RemoteEvent/,
      /RemoteFunction/,
      /Authentication/,
      /Authorization/,
      /Permission/,
      /Security/,
      /Auth/,
      /payment/,
      /currency/,
      /credit/,
      /server.*authority/,
      /validation/,
    ];

    return modifiedPaths.some(path =>
      securityPatterns.some(pattern => pattern.test(path))
    );
  }

  /**
   * Get targeted refresh kinds for security evidence.
   */
  getTargetedRefreshKinds(evidence: ContextEvidence[]): string[] {
    const securityEvidence = this.identifySecurityEvidenceToRefresh(evidence);
    return [...new Set(securityEvidence.map(e => e.kind))];
  }
}

/* ============================================================================
 * REASON MAPPING
 * ========================================================================== */

/**
 * Map invalidation reason to refresh reason.
 */
export function invalidationReasonToRefreshReason(
  reason: ContextInvalidationReason
): ContextRefreshReason {
  const map: Record<ContextInvalidationReason, ContextRefreshReason> = {
    "project-changed": "project-mutation",
    "scope-changed": "scope-change",
    "security-critical-change": "security-change",
    "execution-invalidated": "execution-mutation",
    "recovery-invalidated": "recovery",
    "expired": "stale",
    "manual": "explicit",
    "integrity-failure": "explicit",
  };
  return map[reason];
}