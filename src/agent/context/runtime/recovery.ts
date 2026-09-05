/**
 * P3.6-D â€” Recovery Integration
 *
 * Integrates context lifecycle with P3.4 recovery system.
 * Recovery can invalidate assumptions and trigger context refresh.
 */

import type {
  ContextScope,
  ContextScopeId,
  ContextInvalidationReason,
  ContextCheckpoint,
  ContextEvidence,
  ContextRefreshReason,
} from "../types.js";

/* ============================================================================
 * RECOVERY CONTEXT INTEGRATION
 * ========================================================================== */

/**
 * Handles context lifecycle during recovery operations.
 * Integrates with P3.4 recovery without replacing it.
 */
export class RecoveryContextIntegrator {
  /**
   * Called when recovery begins.
   * Evaluates if context assumptions are still valid.
   *
   * FINDING #14 remediation: invalidation at the recovery boundary is
   * now UNCONDITIONAL. A recovery is inherently a failure of the
   * execution assumptions that the previous context was built on. The
   * pre-recovery context is deterministically invalidated:
   *
   *   - invalidateContext is true for EVERY recovery
   *   - heuristic classification only refines `targetKinds` (which
   *     evidence kinds to re-collect), never becomes the sole reason a
   *     stale context survives
   *   - the caller (agent) invalidates the scope, so the old generation
   *     is guard-denied and a fresh, guard-validated generation is
   *     required before any further model call
   */
  async onRecoveryStart(input: {
    scope: ContextScope;
    evidence: ContextEvidence[];
    errorMessage: string;
    recoveryAction: string;
    checkpoint: ContextCheckpoint;
  }): Promise<{
    invalidateContext: boolean;
    invalidationReason?: ContextInvalidationReason;
    targetedRefresh: boolean;
    targetKinds?: string[];
    reasons: string[];
  }> {
    const { scope, evidence, errorMessage, recoveryAction, checkpoint } = input;
    const reasons: string[] = [];

    // 1. Check if error invalidates security assumptions
    if (this.isSecurityError(errorMessage)) {
      reasons.push("Security-related error detected");
      const securityEvidence = evidence.filter(e =>
        e.securityClassification === "security-critical"
      );
      if (securityEvidence.length > 0) {
        return {
          invalidateContext: true,
          invalidationReason: "security-critical-change",
          targetedRefresh: true,
          targetKinds: [...new Set(securityEvidence.map(e => e.kind))],
          reasons,
        };
      }
    }

    // 2. Check if recovery action modifies project structure
    if (this.modifiesProjectStructure(recoveryAction)) {
      reasons.push("Recovery action modifies project structure");
      return {
        invalidateContext: true,
        invalidationReason: "execution-invalidated",
        targetedRefresh: true,
        targetKinds: ["code", "architecture", "dependency", "placement"],
        reasons,
      };
    }

    // 3. Check if error invalidates execution assumptions.
    //    Always invalidates (FINDING #14); kinds only refine the refresh.
    if (this.invalidatesExecutionAssumptions(errorMessage)) {
      reasons.push("Error invalidates execution assumptions");
      const execEvidence = evidence.filter(e =>
        e.kind === "code" || e.kind === "placement" || e.kind === "dependency" || e.kind === "observation"
      );
      return {
        invalidateContext: true,
        invalidationReason: "execution-invalidated",
        targetedRefresh: true,
        targetKinds: [...new Set(execEvidence.map(e => e.kind))],
        reasons,
      };
    }

    // 4. Check if failure pattern evidence is now stale.
    //    Always invalidates (FINDING #14).
    const failurePatterns = evidence.filter(e => e.kind === "failure-pattern");
    if (failurePatterns.length > 0) {
      reasons.push("Failure pattern evidence may be stale");
      return {
        invalidateContext: true,
        invalidationReason: "recovery-invalidated",
        targetedRefresh: true,
        targetKinds: ["failure-pattern", "lesson"],
        reasons,
      };
    }

    // No heuristic fired â€” STILL invalidate (FINDING #14): a recovery
    // with no recognized matching evidence would otherwise silently keep
    // the pre-recovery context. Deterministic boundary invalidation.
    return {
      invalidateContext: true,
      invalidationReason: "recovery-invalidated",
      targetedRefresh: true,
      reasons: ["Recovery boundary reached â€” context invalidated deterministically"],
    };
  }

  /**
   * Called after recovery completes.
   * Determines if context should be refreshed.
   */
  async onRecoveryComplete(input: {
    scope: ContextScope;
    evidence: ContextEvidence[];
    recoverySuccessful: boolean;
    modifiedPaths: string[];
    checkpoint: ContextCheckpoint;
  }): Promise<{
    shouldRefresh: boolean;
    refreshReason?: ContextRefreshReason;
    refreshType: "targeted" | "full";
    targetKinds?: string[];
    reasons: string[];
  }> {
    const { scope, evidence, recoverySuccessful, modifiedPaths, checkpoint } = input;
    const reasons: string[] = [];

    if (!recoverySuccessful) {
      reasons.push("Recovery was not successful");
      return {
        shouldRefresh: false,
        refreshType: "full",
        reasons,
      };
    }

    // Check for security-relevant modifications
    if (this.hasSecurityRelevantChanges(modifiedPaths)) {
      reasons.push("Security-relevant paths modified during recovery");
      return {
        shouldRefresh: true,
        refreshReason: "security-change",
        refreshType: "targeted",
        targetKinds: ["security", "remote-security", "architecture", "dependency"],
        reasons,
      };
    }

    // Check for execution-relevant changes
    if (this.hasExecutionRelevantChanges(modifiedPaths)) {
      reasons.push("Execution-relevant paths modified during recovery");
      return {
        shouldRefresh: true,
        refreshReason: "execution-mutation",
        refreshType: "targeted",
        targetKinds: ["code", "placement", "dependency", "architecture"],
        reasons,
      };
    }

    // Recovery completed but no significant changes
    return {
      shouldRefresh: false,
      refreshType: "full",
      reasons: ["Recovery completed without significant changes"],
    };
  }

  /**
   * Check if error message indicates a security issue.
   */
  private isSecurityError(errorMessage: string): boolean {
    const securityKeywords = [
      "unauthorized",
      "permission",
      "validation",
      "injection",
      "xss",
      "csrf",
      "authentication",
      "authorization",
      "trust",
      "remote",
      "client.*server",
      "server.*client",
    ];
    return securityKeywords.some(kw => errorMessage.toLowerCase().includes(kw.toLowerCase()));
  }

  /**
   * Check if recovery action modifies project structure.
   */
  private modifiesProjectStructure(recoveryAction: string): boolean {
    const structuralKeywords = [
      "create",
      "delete",
      "move",
      "rename",
      "restructure",
      "refactor",
      "reorganize",
      "rewrite",
    ];
    return structuralKeywords.some(kw => recoveryAction.toLowerCase().includes(kw.toLowerCase()));
  }

  /**
   * Check if error invalidates execution assumptions.
   */
  private invalidatesExecutionAssumptions(errorMessage: string): boolean {
    const executionKeywords = [
      "not found",
      "undefined",
      "nil",
      "type mismatch",
      "argument",
      "parameter",
      "placement",
      "dependency",
      "require",
      "import",
    ];
    return executionKeywords.some(kw => errorMessage.toLowerCase().includes(kw.toLowerCase()));
  }

  /**
   * Check for security-relevant path modifications.
   */
  private hasSecurityRelevantChanges(modifiedPaths: string[]): boolean {
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
      /validation/,
      /server.*authority/,
    ];
    return modifiedPaths.some(path => securityPatterns.some(p => p.test(path)));
  }

  /**
   * Check for execution-relevant path modifications.
   */
  private hasExecutionRelevantChanges(modifiedPaths: string[]): boolean {
    const executionPatterns = [
      /\.luau$/,
      /\.lua$/,
      /Script/,
      /Module/,
      /Remote/,
      /Placement/,
      /Dependency/,
    ];
    return modifiedPaths.some(path => executionPatterns.some(p => p.test(path)));
  }
}

/* ============================================================================
 * RECOVERY CHECKPOINT INTEGRATION
 * ========================================================================== */

/**
 * Map P3.4 recovery states to context checkpoints.
 */
export function recoveryStateToCheckpoint(state: string): ContextCheckpoint {
  const map: Record<string, ContextCheckpoint> = {
    "debug": "pre-recovery",
    "RECOVERING": "pre-recovery",
    "EXECUTING": "post-recovery",
  };
  return map[state] ?? "pre-recovery";
}

/**
 * Get context checkpoint reason for recovery.
 */
export function getRecoveryCheckpointReason(
  fromState: string,
  toState: string,
): ContextRefreshReason {
  if (fromState === "RECOVERING" && toState === "EXECUTING") {
    return "recovery";
  }
  return "explicit";
}

