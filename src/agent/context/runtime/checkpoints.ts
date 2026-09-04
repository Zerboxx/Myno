/**
 * P3.6-D — Context Checkpoints
 *
 * Evaluates context freshness and validity at key lifecycle points.
 * Aligned with P3.4 state machine transitions.
 */

import type {
  ContextScope,
  ContextCheckpoint,
  CheckpointResult,
  ContextRefreshReason,
  ContextRefreshReason as RefreshReason,
  ContextScopeId,
  ContextSelectionStage,
} from "../types.js";
import { evaluateFreshness, isInvalidatedByMutation } from "../freshness.js";
import type { ContextEvidence } from "../types.js";

/* ============================================================================
 * CHECKPOINT EVALUATOR
 * ========================================================================== */

/**
 * Evaluates context validity at checkpoints.
 */
export class CheckpointEvaluator {
  private readonly lastCheckpointTimes = new Map<ContextScopeId, number>();
  private readonly projectFingerprints = new Map<ContextScopeId, string>();

  /**
   * Evaluate context at a checkpoint.
   */
  evaluate(input: {
    scope: ContextScope;
    evidence: ContextEvidence[];
    checkpoint: ContextCheckpoint;
    projectFingerprint?: string;
    stage: ContextSelectionStage;
    timeSinceLastRefreshMs: number;
    securityRelevantChange: boolean;
  }): CheckpointResult {
    const { scope, evidence, checkpoint, projectFingerprint, stage, timeSinceLastRefreshMs, securityRelevantChange } = input;

    const reasons: string[] = [];
    let valid = true;
    let refreshRecommended = false;
    let refreshReason: ContextRefreshReason | undefined;

    // 1. Check if scope is in valid state
    if (scope.lifecycleState === "invalidated" || scope.lifecycleState === "failed") {
      return {
        checkpoint,
        valid: false,
        refreshRecommended: false,
        reasons: [`Scope is ${scope.lifecycleState}`],
        timestamp: Date.now(),
      };
    }

    // 2. Project fingerprint change detection
    if (projectFingerprint) {
      const oldFingerprint = this.projectFingerprints.get(scope.scopeId);
      this.projectFingerprints.set(scope.scopeId, projectFingerprint);

      if (oldFingerprint && oldFingerprint !== projectFingerprint) {
        reasons.push("Project fingerprint changed");
        valid = false;
        refreshRecommended = true;
        refreshReason = "project-mutation";
      }
    }

    // 3. Security-critical change detection
    if (securityRelevantChange) {
      reasons.push("Security-relevant change detected");
      refreshRecommended = true;
      refreshReason = "security-change";
    }

    // 4. Freshness evaluation
    const { evidence: freshEvidence, staleCount } = evaluateFreshness(
      evidence,
      !!refreshReason, // project changed if refresh recommended
      this.projectFingerprints.get(scope.scopeId),
      projectFingerprint,
    );

    if (staleCount > 0) {
      reasons.push(`${staleCount} evidence items are stale`);
      // Don't invalidate just for staleness unless critical
      const criticalStale = freshEvidence.filter(
        e => e.freshness.level === "stale" && e.securityClassification === "security-critical"
      );
      if (criticalStale.length > 0) {
        valid = false;
        refreshRecommended = true;
        refreshReason = refreshReason ?? "stale";
      }
    }

    // 5. Stage-specific checks
    const stageCheck = this.checkStageRequirements(evidence, stage);
    if (!stageCheck.satisfied) {
      reasons.push(...stageCheck.missing);
      refreshRecommended = true;
      refreshReason = refreshReason ?? "explicit";
    }

    // 6. Time-based staleness (configurable threshold)
    if (timeSinceLastRefreshMs > 30 * 60 * 1000) { // 30 minutes
      reasons.push("Context older than 30 minutes");
      refreshRecommended = true;
      refreshReason = refreshReason ?? "stale";
    }

    // Record checkpoint time
    this.lastCheckpointTimes.set(scope.scopeId, Date.now());

    return {
      checkpoint,
      valid,
      refreshRecommended,
      reasons,
      refreshReason,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if evidence satisfies stage-specific requirements.
   */
  private checkStageRequirements(
    evidence: ContextEvidence[],
    stage: ContextSelectionStage,
  ): { satisfied: boolean; missing: string[] } {
    const missing: string[] = [];

    switch (stage) {
      case "planning":
        if (!evidence.some(e => e.kind === "architecture" || e.kind === "constraint")) {
          missing.push("No architecture or constraint evidence for planning");
        }
        break;
      case "execution":
        if (!evidence.some(e => e.kind === "placement" || e.kind === "dependency" || e.kind === "code")) {
          missing.push("No placement/dependency/code evidence for execution");
        }
        break;
      case "verification":
        if (!evidence.some(e => e.kind === "verification" || e.kind === "runtime-error" || e.kind === "code-error")) {
          missing.push("No verification evidence for verification stage");
        }
        break;
      case "recovery":
        if (!evidence.some(e => e.kind === "failure-pattern" || e.kind === "lesson" || e.kind === "runtime-error")) {
          missing.push("No failure pattern/lesson evidence for recovery");
        }
        break;
    }

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  /**
   * Get time since last checkpoint.
   */
  getTimeSinceLastCheckpoint(scopeId: ContextScopeId): number {
    const last = this.lastCheckpointTimes.get(scopeId);
    if (!last) return Infinity;
    return Date.now() - last;
  }

  /**
   * Reset checkpoint times (for testing or scope reset).
   */
  reset(scopeId?: ContextScopeId): void {
    if (scopeId) {
      this.lastCheckpointTimes.delete(scopeId);
      this.projectFingerprints.delete(scopeId);
    } else {
      this.lastCheckpointTimes.clear();
      this.projectFingerprints.clear();
    }
  }
}

/* ============================================================================
 * CHECKPOINT MAPPING
 * ========================================================================== */

/**
 * Map P3.4 state machine states to context checkpoints.
 */
export function stateToCheckpoint(state: string): ContextCheckpoint | null {
  const map: Record<string, ContextCheckpoint> = {
    "THINKING": "pre-planning",
    "PLANNING": "post-planning",
    "EXECUTING": "pre-execution",
    "VERIFYING": "pre-verification",
    "RECOVERING": "pre-recovery",
    "COMPLETED": "finalization",
  };
  return map[state] ?? null;
}

/**
 * Check if a state transition requires a checkpoint evaluation.
 */
export function requiresCheckpoint(fromState: string, toState: string): boolean {
  // All transitions in the active state machine require checkpoint
  const activeStates = ["THINKING", "PLANNING", "EXECUTING", "VERIFYING", "RECOVERING"];
  return activeStates.includes(fromState) && activeStates.includes(toState);
}

/**
 * Get the next expected checkpoint for a state.
 */
export function getNextCheckpoint(state: string): ContextCheckpoint | null {
  const map: Record<string, ContextCheckpoint> = {
    "THINKING": "pre-planning",
    "INSPECTING": "post-planning",
    "PLANNING": "post-planning",
    "EXECUTING": "pre-execution",
    "VERIFYING": "pre-verification",
    "RECOVERING": "pre-recovery",
    "COMPLETED": "finalization",
  };
  return map[state] ?? null;
}