/**
 * P3.6-D — Context Runtime Integration
 *
 * Barrel exports for context runtime lifecycle management.
 */

// Types
export type {
  ContextScopeId,
  ContextLifecycleState,
  ContextInvalidationReason,
  ContextScope,
  RuntimeContext,
  ContextCheckpoint,
  CheckpointResult,
  ContextRefreshReason,
  RefreshEvaluation,
  RefreshDecision,
  ContextGuardResult,
  ContextAuditEvent,
  ContextAuditEventType,
  ReuseDecision,
  ReuseEvaluationInput,
  TaskContextMetrics,
  ContextMetrics,
  RecoveryContextInput,
  RecoveryContextDecision,
} from "./types.js";

// Lifecycle
export {
  ContextLifecycleManager,
  type LifecycleManagerConfig,
} from "./lifecycle.js";

// Scope
export {
  ContextScopeManager,
} from "./scope.js";

// Checkpoints
export {
  CheckpointEvaluator,
  stateToCheckpoint,
  requiresCheckpoint,
  getNextCheckpoint,
} from "./checkpoints.js";

// Invalidation
export {
  ContextInvalidator,
  SecurityContextInvalidator,
  invalidationReasonToRefreshReason,
} from "./invalidation.js";

// Isolation
export {
  ContextIsolationManager,
  EvidenceIsolation,
  TrustBoundaryEnforcer,
  isTrustAllowedFor,
  type TrustDestination,
  INSTRUCTION_TRUST_ALLOWLIST,
  REFERENCE_TRUST_ALLOWLIST,
} from "./isolation.js";

// Tool Execution Effects
export {
  computeToolExecutionEffects,
  extractPathArgs,
  isSecurityRelevantPath,
  isMutationRelevantPath,
  executionEffectsToDecision,
  type ToolExecutionEffects,
  type RegisteredToolFlags,
  type ExecutionEffectsDecision,
} from "./effects.js";

// Activation
export {
  ContextActivationService,
  type ActivationResult,
  type ActivationOk,
  type ActivationFailed,
  type ActivationFailure,
  type ScopeEvidenceSet,
} from "./activation.js";

// Observability
export {
  ContextMetricsCollector,
  P351MetricsAdapter,
  RealtimeContextMetrics,
  CONTEXT_METRIC_NAMES,
} from "./observability.js";

// Guard
export {
  ContextGuard,
  createGuardResult,
  combineGuardResults,
  isCriticalFailure,
} from "./guard.js";

// Security-Evidence Policy (BLOCKER #22)
export {
  SECURITY_COLLECTOR_IDS,
  isSecurityCriticalEvidence,
  countSecurityCriticalEvidence,
  countInvalidSecurityCriticalEvidence,
  isSecurityCollectorFailure,
} from "./security-evidence-policy.js";

// Recovery
export {
  RecoveryContextIntegrator,
  recoveryStateToCheckpoint,
  getRecoveryCheckpointReason,
} from "./recovery.js";