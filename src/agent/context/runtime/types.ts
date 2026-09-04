/**
 * P3.6-D — Context Runtime Types
 *
 * Canonical types for context lifecycle management.
 * Integrates with P3.6-A/B/C without modifying their contracts.
 */

import type {
  ContextEvidenceId,
  ContextSnapshot,
  ContextSelectionResult,
  AssembledContext,
  ContextSelectionStage,
} from "../index.js";

/* ============================================================================
 * CONTEXT SCOPE
 * ========================================================================== */

/** Unique identifier for a context scope */
export type ContextScopeId = string;

/** Lifecycle state of a context scope */
export type ContextLifecycleState =
  | "created"
  | "collecting"
  | "frozen"
  | "active"
  | "refreshing"
  | "validating"
  | "finalizing"
  | "completed"
  | "invalidated"
  | "failed";

/**
 * A runtime context scope for a task.
 * Every top-level task creates a new scope.
 * Subtasks may reference parent scope but must not mutate it.
 */
export interface ContextScope {
  /** Unique scope identifier */
  scopeId: ContextScopeId;

  /** Task this scope belongs to */
  taskId: string;

  /** Parent scope for subtasks */
  parentScopeId?: ContextScopeId;

  /** Project identifier if available */
  projectId?: string;

  /** When this scope was created */
  createdAt: number;

  /** Current lifecycle state */
  lifecycleState: ContextLifecycleState;

  /** Monotonic generation counter */
  generation: number;

  /** Evidence IDs in this scope (immutable once frozen) */
  evidenceIds: readonly ContextEvidenceId[];

  /** Snapshot ID this scope is based on */
  snapshotId?: string;

  /** Assembly hash for integrity */
  assemblyHash?: string;

  /** When this scope was frozen for use */
  frozenAt?: number;

  /** Current agent stage if active */
  currentStage?: ContextSelectionStage;

  /** Invalidation reason if invalidated */
  invalidationReason?: ContextInvalidationReason;
}

/* ============================================================================
 * RUNTIME CONTEXT
 * ========================================================================== */

/** Reason for context invalidation */
export type ContextInvalidationReason =
  | "project-changed"
  | "scope-changed"
  | "security-critical-change"
  | "execution-invalidated"
  | "recovery-invalidated"
  | "expired"
  | "manual"
  | "integrity-failure";

/** Canonical runtime context object */
export interface RuntimeContext {
  /** The scope this context belongs to */
  scope: ContextScope;

  /** Snapshot ID */
  snapshotId: string;

  /** Generation number */
  generation: number;

  /** Current agent stage */
  stage: ContextSelectionStage;

  /** Assembly integrity hash */
  assemblyHash: string;

  /** Rendered assembly string for prompt injection */
  assembly: string;

  /** Evidence IDs included in this context (immutable) */
  evidenceIds: readonly ContextEvidenceId[];

  /** When this context was created */
  createdAt: number;

  /** When this context was frozen for use */
  frozenAt: number;

  /** Current status */
  status: "active" | "superseded" | "invalidated" | "completed";

  /** Invalidation reason if applicable */
  invalidationReason?: ContextInvalidationReason;
}

/* ============================================================================
 * CHECKPOINTS
 * ========================================================================== */

/** Lifecycle checkpoints aligned with P3.4 state machine */
export type ContextCheckpoint =
  | "pre-planning"
  | "post-planning"
  | "pre-execution"
  | "post-execution"
  | "pre-verification"
  | "post-verification"
  | "pre-recovery"
  | "post-recovery"
  | "finalization";

/** Checkpoint evaluation result */
export interface CheckpointResult {
  /** The checkpoint that was evaluated */
  checkpoint: ContextCheckpoint;

  /** Whether context is still valid */
  valid: boolean;

  /** Whether refresh is recommended */
  refreshRecommended: boolean;

  /** Reasons for the evaluation */
  reasons: string[];

  /** If refresh needed, the reason */
  refreshReason?: ContextRefreshReason;

  /** Timestamp */
  timestamp: number;
}

/* ============================================================================
 * REFRESH
 * ========================================================================== */

/** Reason for context refresh */
export type ContextRefreshReason =
  | "project-mutation"
  | "execution-mutation"
  | "security-change"
  | "recovery"
  | "scope-change"
  | "explicit"
  | "stale";

/** Refresh evaluation input */
export interface RefreshEvaluation {
  /** The scope being evaluated */
  scopeId: ContextScopeId;

  /** Current generation */
  currentGeneration: number;

  /** Project fingerprint before operation */
  beforeFingerprint?: string;

  /** Project fingerprint after operation */
  afterFingerprint?: string;

  /** Whether security-relevant changes occurred */
  securityRelevantChange: boolean;

  /** Triggering checkpoint */
  checkpoint: ContextCheckpoint;

  /** Time since last refresh */
  timeSinceLastRefreshMs: number;
}

/** Refresh decision */
export interface RefreshDecision {
  /** Whether to refresh */
  shouldRefresh: boolean;

  /** Reason for refresh if applicable */
  reason?: ContextRefreshReason;

  /** Type of refresh */
  refreshType: "targeted" | "full";

  /** Specific evidence kinds to refresh (if targeted) */
  targetKinds?: string[];
}

/* ============================================================================
 * GUARD
 * ========================================================================== */

/** Context guard validation result */
export interface ContextGuardResult {
  /** Whether context injection is allowed */
  allowed: boolean;

  /** Reasons for the decision */
  reasons: string[];

  /** Warnings that don't block but should be noted */
  warnings: string[];

  /** Whether refresh is required before use */
  requiresRefresh: boolean;
}

/* ============================================================================
 * AUDIT
 * ========================================================================== */

/** Context lifecycle audit event */
export interface ContextAuditEvent {
  /** Unique event identifier */
  eventId: string;

  /** Scope this event belongs to */
  scopeId: ContextScopeId;

  /** Task identifier */
  taskId: string;

  /** Generation at time of event */
  generation: number;

  /** Event type */
  event: ContextAuditEventType;

  /** Timestamp */
  timestamp: number;

  /** Optional reason */
  reason?: string;

  /** Optional metadata (no sensitive content) */
  metadata?: Record<string, unknown>;
}

/** Types of audit events */
export type ContextAuditEventType =
  | "created"
  | "collected"
  | "validated"
  | "snapshot-created"
  | "assembled"
  | "frozen"
  | "activated"
  | "checkpoint"
  | "refresh-requested"
  | "refreshed"
  | "invalidated"
  | "guard-rejected"
  | "superseded"
  | "finalized"
  | "failed"
  | "trust-boundary-filtered"
  | "guard-refresh-deferred"
  | "execution-invalidation";

/* ============================================================================
 * REUSE
 * ========================================================================== */

/** Context reuse decision */
export type ReuseDecision =
  | "REUSE"
  | "REUSE_WITH_REFRESH"
  | "REFERENCE_ONLY"
  | "REJECT";

/** Input for reuse evaluation */
export interface ReuseEvaluationInput {
  /** Source context scope */
  sourceScopeId: ContextScopeId;

  /** Target scope requesting reuse */
  targetScopeId: ContextScopeId;

  /** Target stage */
  targetStage: ContextSelectionStage;

  /** Whether project is the same */
  sameProject: boolean;
}

/* ============================================================================
 * METRICS
 * ========================================================================== */

/** Per-task context metrics */
export interface TaskContextMetrics {
  /** Task identifier */
  taskId: string;

  /** Scope identifier */
  scopeId: ContextScopeId;

  /** Total generations created */
  generations: number;

  /** Number of refreshes performed */
  refreshCount: number;

  /** Number of invalidations */
  invalidationCount: number;

  /** Number of guard failures */
  guardFailures: number;

  /** Final context assembly hash */
  finalContextHash: string;

  /** Total time spent in context lifecycle (ms) */
  totalLifecycleMs: number;

  /** Time spent in refreshes (ms) */
  refreshLatencyMs: number;

  /** Number of checkpoints evaluated */
  checkpointsEvaluated: number;
}

/** Aggregated context metrics */
export interface ContextMetrics {
  /** Total contexts created */
  contextsCreated: number;

  /** Total contexts refreshed */
  contextsRefreshed: number;

  /** Total contexts invalidated */
  contextsInvalidated: number;

  /** Total guard rejections */
  guardRejections: number;

  /** Average generations per task */
  avgGenerationsPerTask: number;

  /** Average context refresh latency (ms) */
  avgRefreshLatencyMs: number;

  /** Stale contexts detected */
  staleContextsDetected: number;

  /** Security context refreshes */
  securityContextRefreshes: number;

  /** Cross-scope reuse attempts */
  crossScopeReuseAttempts: number;

  /** Successful cross-scope reuses */
  crossScopeReuses: number;
}

/* ============================================================================
 * RECOVERY
 * ========================================================================== */

/** Recovery context integration input */
export interface RecoveryContextInput {
  /** Scope being recovered */
  scopeId: ContextScopeId;

  /** Recovery checkpoint */
  checkpoint: ContextCheckpoint;

  /** Whether execution side effects occurred */
  executionSideEffects: boolean;

  /** Whether security-relevant files were modified */
  securityRelevantChange: boolean;

  /** Error that triggered recovery */
  error: Error;
}

/** Recovery context decision */
export interface RecoveryContextDecision {
  /** Whether context needs invalidation */
  invalidateContext: boolean;

  /** Invalidation reason if applicable */
  invalidationReason?: ContextInvalidationReason;

  /** Whether targeted refresh is needed */
  targetedRefresh: boolean;

  /** Specific evidence kinds to refresh */
  targetKinds?: string[];
}