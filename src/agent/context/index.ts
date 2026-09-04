/**
 * P3.6-A/B/C/D — Context Evidence Data Model, Collection Pipeline, Selection Engine & Runtime Integration
 *
 * Architecture:
 *   Raw Sources → Collectors → Normalization → Validation →
 *   Deduplication → Freshness → Prioritization → Collection → Snapshot
 *                                         ↓
 *                           Selection → Assembly → LLM Context
 *                                         ↓
 *                           Runtime Lifecycle → Lifecycle Management
 */

// Core types
export type {
  ContextEvidenceId,
  EvidenceKind,
  SourceType,
  ContextSource,
  ProvenanceChain,
  ContextContent,
  ContextRelevance,
  ContextConfidence,
  FreshnessLevel,
  ContextFreshness,
  CriticalityLevel,
  PriorityLevel,
  SecurityClassification,
  TokenEstimate,
  DeduplicationKey,
  EvidenceStatus,
  TrustLevel,
  ContextEvidence,
  ContextCollectionMetadata,
  ContextCollection,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  // P3.6-C Selection types
  ContextSelectionStage,
  ContextSelectionReason,
  ContextDropReason,
  EvidenceDetailLevel,
  SelectedContextEvidence,
  DroppedContextEvidence,
  ContextSelectionResult,
  ContextSelectionMetrics,
  TrustRenderMode,
  ContextReference,
  // P3.6-D Runtime types
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

export {
  CONTEXT_SCHEMA_VERSION,
  VALID_EVIDENCE_KINDS,
  VALID_SOURCE_TYPES,
  VALID_CRITICALITY_LEVELS,
  VALID_PRIORITY_LEVELS,
  VALID_SECURITY_CLASSIFICATIONS,
  VALID_TRUST_LEVELS,
  VALID_FRESHNESS_LEVELS,
  VALID_EVIDENCE_STATUSES,
} from "./types.js";

// Evidence construction
export {
  generateEvidenceId,
  estimateTokens,
  estimateStructuredTokens,
  generateDeduplicationKey,
  createEvidence,
  createDerivedEvidence,
  type EvidenceInput,
} from "./evidence.js";

// Collection operations
export {
  createCollection,
  computeMetadata,
  addEvidence,
  removeEvidence,
  filterEvidence,
  sortEvidence,
  getByKind,
  getSecurityCritical,
  getTotalTokens,
  getEvidenceCount,
  hasSecurityCritical,
  mergeCollections,
  deduplicateByKey,
  getDeduplicationGroups,
} from "./collection.js";

// Validation
export {
  validateContextEvidence,
  validateContextCollection,
} from "./validation.js";

// Serialization
export {
  serializeEvidence,
  deserializeEvidence,
  serializeCollection,
  deserializeCollection,
  testRoundTrip,
  testCollectionRoundTrip,
  auditSerializedSecrets,
} from "./serialization.js";

// Adapters
export {
  adaptSecurityVulnerabilities,
  adaptArchitectureRecommendations,
  adaptDependencyViolations,
  adaptPlacementFindings,
  adaptLessons,
  adaptKnowledge,
  adaptPerformanceFindings,
  adaptQualityEvaluation,
} from "./adapters/intelligence.js";

// P3.6-B: Provenance
export {
  buildProvenance,
  buildDerivedProvenance,
  getProvenanceDepth,
  wouldCreateCycle,
  hasCycle,
  validateParentEvidence,
  wouldExceedMaxDepth,
} from "./provenance.js";

// P3.6-B: Freshness
export {
  classifyFreshness,
  evaluateFreshness,
  isInvalidatedByMutation,
  getFreshnessPolicy,
} from "./freshness.js";

// P3.6-B: Prioritization
export {
  computePriority,
  assignPriority,
  explainPriority,
  comparePriority,
  type PriorityScore,
} from "./prioritization.js";

// P3.6-B: Snapshot
export {
  createSnapshot,
  isSnapshotImmutable,
  type ContextSnapshot,
} from "./snapshot.js";

// P3.6-B: Pipeline
export {
  executePipeline,
  type PipelineResult,
  type PipelineMetrics,
  type ContextPipelineOptions,
} from "./pipeline.js";

// P3.6-B: Collectors
export {
  taskCollector,
  projectMapCollector,
  intelligenceCollector,
  executionCollector,
  verificationCollector,
  lessonCollector,
  ALL_COLLECTORS,
  type ContextCollector,
  type ContextCollectionRequest,
  type CollectorResult,
} from "./collectors/collectors.js";

// P3.6-C: Selection
export {
  checkEligibility,
  selectEvidence,
  selectContext,
  type EligibilityInput,
  type EligibilityResult,
  type SelectionInput,
  type SelectionResult,
  type SelectContextInput,
} from "./selection.js";

// P3.6-C: Relevance
export {
  computeRelevance,
  computeRelevanceBatch,
  formatRelevanceExplanation,
  type RelevanceFactors,
  type RelevanceExplanation,
} from "./relevance.js";

// P3.6-C: Conflicts
export {
  detectConflicts,
  type ContextConflictType,
  type ConflictResolution,
  type ContextConflict,
  type ConflictDetectionResult,
} from "./conflicts.js";

// P3.6-C: Budget Allocation
export {
  allocateBudget,
  shouldCompress,
  getCompressionRatio,
  getContextBudget,
  type ContextBudgetProfile,
  type AllocationCategory,
  type CategoryAllocation,
  type BudgetAllocationResult,
} from "./budget-allocation.js";

// P3.6-C: Progressive Disclosure
export {
  createReference,
  createReferences,
  renderReferences,
  computeDisclosureMetadata,
  type DeferralInput,
  type ReferenceRenderOptions,
  type ProgressiveDisclosureMetadata,
} from "./progressive-disclosure.js";

// P3.6-C: Assembly
export {
  assembleContext,
  renderContextPackage,
  type AssemblySection,
  type AssembledContext,
} from "./assembly.js";

// P3.6-D: Runtime Lifecycle
export {
  ContextLifecycleManager,
  type LifecycleManagerConfig,
} from "./runtime/lifecycle.js";

// P3.6-D: Scope Management
export {
  ContextScopeManager,
} from "./runtime/scope.js";

// P3.6-D: Checkpoints
export {
  CheckpointEvaluator,
  stateToCheckpoint,
  requiresCheckpoint,
  getNextCheckpoint,
} from "./runtime/checkpoints.js";

// P3.6-D: Invalidation
export {
  ContextInvalidator,
  SecurityContextInvalidator,
  invalidationReasonToRefreshReason,
} from "./runtime/invalidation.js";

// P3.6-D: Isolation
export {
  ContextIsolationManager,
  EvidenceIsolation,
  TrustBoundaryEnforcer,
  isTrustAllowedFor,
  type TrustDestination,
  INSTRUCTION_TRUST_ALLOWLIST,
  REFERENCE_TRUST_ALLOWLIST,
} from "./runtime/isolation.js";

// P3.6-D: Tool Execution Effects
export {
  computeToolExecutionEffects,
  extractPathArgs,
  isSecurityRelevantPath,
  isMutationRelevantPath,
  executionEffectsToDecision,
  type ToolExecutionEffects,
  type RegisteredToolFlags,
  type ExecutionEffectsDecision,
} from "./runtime/effects.js";

// P3.6-D: Context Activation
export {
  ContextActivationService,
  type ActivationResult,
  type ActivationOk,
  type ActivationFailed,
  type ActivationFailure,
  type ScopeEvidenceSet,
} from "./runtime/activation.js";

// P3.6-D: Observability
export {
  ContextMetricsCollector,
  P351MetricsAdapter,
  RealtimeContextMetrics,
  CONTEXT_METRIC_NAMES,
} from "./runtime/observability.js";

// P3.6-D: Guard
export {
  ContextGuard,
  createGuardResult,
  combineGuardResults,
  isCriticalFailure,
  validateScope,
  validateAssembly,
} from "./runtime/guard.js";

// P3.6-D: Recovery Integration
export {
  RecoveryContextIntegrator,
  recoveryStateToCheckpoint,
  getRecoveryCheckpointReason,
  extractRecoveryContext,
  type RecoveryContextPolicy,
  DEFAULT_RECOVERY_CONTEXT_POLICY,
  applyRecoveryContextPolicy,
} from "./runtime/recovery.js";
