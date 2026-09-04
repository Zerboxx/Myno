/**
 * P3.6-A — Canonical Context Evidence Data Model
 *
 * This is the single source of truth for how MYNO represents
 * intelligence/context evidence as typed data.
 *
 * Every future P3.6 subsystem (retrieval, ranking, compression,
 * token governor, assembly) depends on these contracts.
 *
 * ContextEvidence is DATA. It never executes code.
 * It must never have implicit privilege to modify system instructions.
 */

/* ============================================================================
 * EVIDENCE ID
 * ========================================================================== */

/**
 * Stable unique identifier for a context evidence item.
 * Survives sorting, filtering, compression, and context assembly.
 * NOT based on array position.
 */
export type ContextEvidenceId = string;

/* ============================================================================
 * EVIDENCE KIND
 * ========================================================================== */

/**
 * Controlled classification of evidence content type.
 * Normalized from existing intelligence engine categories.
 */
export type EvidenceKind =
  | "project-map"
  | "architecture"
  | "code"
  | "code-error"
  | "runtime-error"
  | "security"
  | "remote-security"
  | "performance"
  | "world-building"
  | "ui"
  | "gameplay"
  | "knowledge"
  | "lesson"
  | "failure-pattern"
  | "constitution"
  | "placement"
  | "dependency"
  | "observation"
  | "verification"
  | "user-input"
  | "constraint"
  | "quality"
  | "responsive";

/* ============================================================================
 * SOURCE / PROVENANCE
 * ========================================================================== */

/**
 * Where this evidence came from.
 * Enables traceability: "Where did this fact come from?"
 */
export type SourceType =
  | "project-map"
  | "intelligence-engine"
  | "knowledge-base"
  | "lesson-store"
  | "failure-memory"
  | "mcp"
  | "studio-observation"
  | "user"
  | "agent"
  | "cache"
  | "generated-summary"
  | "adapter"
  | "unknown";

/**
 * Structured source metadata for provenance tracking.
 */
export interface ContextSource {
  /** What type of source produced this evidence */
  sourceType: SourceType;
  /** Specific engine/identifier that produced it (e.g., "security-intelligence", "architecture-engine") */
  sourceId: string;
  /** Human-readable source name */
  sourceName: string;
  /** Task that produced this evidence, if any */
  taskId?: string;
  /** Studio session ID, if from live inspection */
  studioId?: string;
  /** When this evidence was produced */
  timestamp: number;
}

/**
 * Provenance chain — lightweight traceability.
 * Supports: User Request → Engine → Observation → Evidence → Compression → Context
 */
export interface ProvenanceChain {
  /** The original evidence IDs this was derived from (empty if raw) */
  derivedFrom: ContextEvidenceId[];
  /** Step descriptions in the provenance chain */
  steps: string[];
}

/* ============================================================================
 * CONTENT MODEL
 * ========================================================================== */

/**
 * Structured content types for evidence.
 * Avoids `content: any` while remaining flexible.
 */
export type ContextContent =
  | { type: "text"; value: string }
  | { type: "structured"; value: Record<string, unknown> }
  | { type: "code"; language: "luau" | "lua" | "unknown"; value: string }
  | { type: "error"; message: string; stack?: string }
  | { type: "reference"; targetKind: EvidenceKind; targetId: string; description: string }
  | { type: "null" };

/* ============================================================================
 * RELEVANCE
 * ========================================================================== */

/**
 * Normalized relevance score: 0.0 (not relevant) → 1.0 (highly relevant).
 * Answers: "How relevant is this evidence to the current task?"
 * NOT the same as priority or criticality.
 */
export type ContextRelevance = number;

/* ============================================================================
 * CONFIDENCE
 * ========================================================================== */

/**
 * Normalized confidence score: 0.0 (no confidence) → 1.0 (fully confident).
 * Answers: "How confident are we that this evidence is correct?"
 * NOT importance — that belongs to priority/criticality.
 * UNKNOWN is representable via the sentinel value.
 */
export type ContextConfidence = number | "unknown";

/* ============================================================================
 * FRESHNESS
 * ========================================================================== */

/**
 * How fresh/trustworthy the evidence is for the current task.
 */
export type FreshnessLevel =
  | "current"     // Just produced, actively fresh
  | "recent"      // Within acceptable age
  | "stale"       // May be outdated
  | "unknown";    // Cannot determine freshness

/**
 * Structured freshness metadata.
 */
export interface ContextFreshness {
  level: FreshnessLevel;
  /** When the evidence was originally produced */
  producedAt: number;
  /** When the evidence was last validated, if known */
  validatedAt?: number;
  /** TTL in ms, if applicable (0 = no expiry) */
  ttlMs?: number;
}

/* ============================================================================
 * CRITICALITY
 * ========================================================================== */

/**
 * How important this evidence is for correct agent behavior.
 * Used later by Context Budget Governor to protect critical evidence.
 */
export type CriticalityLevel =
  | "informational"  // Nice to have, safe to drop
  | "relevant"       // Useful, preferred to keep
  | "important"      // Significant, should keep if possible
  | "critical";      // Must not be dropped by budget/compression

/* ============================================================================
 * PRIORITY
 * ========================================================================== */

/**
 * Deterministic priority for ranking and assembly.
 * Separate from relevance, confidence, and criticality.
 */
export type PriorityLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

/* ============================================================================
 * SECURITY CLASSIFICATION
 * ========================================================================== */

/**
 * Security sensitivity of evidence.
 * Independent from relevance — an obscure vuln may have moderate relevance
 * but MUST remain protected as security-critical.
 */
export type SecurityClassification =
  | "none"
  | "security-relevant"
  | "security-critical";

/* ============================================================================
 * TOKEN ESTIMATION
 * ========================================================================== */

/**
 * Estimated input token cost.
 * This is an estimate, NOT exact model tokenization.
 * Future P3.6 stages may improve the estimator.
 */
export type TokenEstimate = number;

/* ============================================================================
 * DEDUPLICATION KEY
 * ========================================================================== */

/**
 * Deterministic key for detecting semantically identical evidence
 * from different engines/sources.
 * Different from ContextEvidenceId — IDs are unique, dedup keys are semantic.
 */
export type DeduplicationKey = string;

/* ============================================================================
 * EVIDENCE STATUS
 * ========================================================================== */

/**
 * Current state of the evidence.
 * Stale evidence is NOT automatically deleted — future retrieval decides.
 */
export type EvidenceStatus =
  | "valid"
  | "stale"
  | "unknown"
  | "superseded";

/* ============================================================================
 * TRUST LEVEL
 * ========================================================================== */

/**
 * Trust classification for prompt-boundary safety.
 * ContextEvidence is DATA — it must never have implicit privilege
 * to modify system instructions, tool permissions, or security policy.
 */
export type TrustLevel =
  | "system"           // Produced by MYNO's own trusted systems
  | "project-data"     // Derived from project inspection — treat as DATA
  | "user-input"       // From the user — may be trusted but is not system
  | "external"         // From external knowledge, MCP, or third-party
  | "unknown";         // Cannot determine trust

/* ============================================================================
 * CONTEXT EVIDENCE
 * ========================================================================== */

/**
 * ONE meaningful piece of information that may be supplied to the Agent.
 *
 * This is the canonical representation. Every future P3.6 subsystem
 * (retrieval, ranking, compression, token governor, assembly) operates
 * on this type.
 *
 * ContextEvidence is DATA. It never executes code.
 */
export interface ContextEvidence {
  /** Stable unique identifier — survives sorting, filtering, compression */
  id: ContextEvidenceId;

  /** What type of evidence this is */
  kind: EvidenceKind;

  /** Where this evidence came from */
  source: ContextSource;

  /** The actual content */
  content: ContextContent;

  /** How relevant this evidence is to the current task (0.0 → 1.0) */
  relevance: ContextRelevance;

  /** How confident we are this evidence is correct (0.0 → 1.0 or "unknown") */
  confidence: ContextConfidence;

  /** How fresh the evidence is */
  freshness: ContextFreshness;

  /** How important for correct agent behavior */
  criticality: CriticalityLevel;

  /** Priority for ranking and assembly */
  priority: PriorityLevel;

  /** Estimated input token cost */
  tokenEstimate: TokenEstimate;

  /** Deterministic key for deduplication */
  deduplicationKey: DeduplicationKey;

  /** Current state of the evidence */
  status: EvidenceStatus;

  /** Security sensitivity classification */
  securityClassification: SecurityClassification;

  /** Trust level for prompt-boundary safety */
  trustLevel: TrustLevel;

  /** When this evidence was created */
  createdAt: number;

  /** When this evidence was last updated */
  updatedAt: number;

  /** Provenance chain — if derived from other evidence */
  provenance: ProvenanceChain;

  /** Tags for flexible categorization */
  tags: string[];

  /** Schema/model version for future compatibility */
  schemaVersion: number;
}

/* ============================================================================
 * CONTEXT COLLECTION
 * ========================================================================== */

/**
 * Metadata about a collection of evidence items.
 */
export interface ContextCollectionMetadata {
  /** Task this collection was built for */
  taskId: string;
  /** When the collection was created */
  createdAt: number;
  /** Number of evidence items */
  evidenceCount: number;
  /** Estimated total tokens across all evidence */
  estimatedTokens: number;
  /** Number of security-critical items */
  securityCriticalCount: number;
  /** Source type distribution */
  sourceTypeCounts: Record<SourceType, number>;
  /** Evidence kind distribution */
  kindCounts: Record<EvidenceKind, number>;
  /** Collection schema version */
  schemaVersion: number;
}

/**
 * Canonical collection of context evidence.
 * The unit that flows through the P3.6 pipeline.
 */
export interface ContextCollection {
  /** The evidence items */
  evidence: ContextEvidence[];
  /** Collection metadata */
  metadata: ContextCollectionMetadata;
}

/* ============================================================================
 * VALIDATION RESULT
 * ========================================================================== */

/**
 * Result of validating evidence or a collection.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error";
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: "warning";
}

/* ============================================================================
 * SCHEMA VERSION
 * ========================================================================== */

/**
 * Current schema version for the Context Evidence model.
 * Increment when the model changes in a backward-incompatible way.
 */
export const CONTEXT_SCHEMA_VERSION = 1;

/* ============================================================================
 * CONSTANTS
 * ========================================================================== */

/** Valid evidence kind values for runtime validation */
export const VALID_EVIDENCE_KINDS: readonly EvidenceKind[] = [
  "project-map", "architecture", "code", "code-error", "runtime-error",
  "security", "remote-security", "performance", "world-building",
  "ui", "gameplay", "knowledge", "lesson", "failure-pattern",
  "constitution", "placement", "dependency", "observation",
  "verification", "user-input", "constraint", "quality", "responsive",
] as const;

/** Valid source type values */
export const VALID_SOURCE_TYPES: readonly SourceType[] = [
  "project-map", "intelligence-engine", "knowledge-base", "lesson-store",
  "failure-memory", "mcp", "studio-observation", "user", "agent",
  "cache", "generated-summary", "adapter", "unknown",
] as const;

/** Valid criticality levels */
export const VALID_CRITICALITY_LEVELS: readonly CriticalityLevel[] = [
  "informational", "relevant", "important", "critical",
] as const;

/** Valid priority levels */
export const VALID_PRIORITY_LEVELS: readonly PriorityLevel[] = [
  "low", "medium", "high", "critical",
] as const;

/** Valid security classifications */
export const VALID_SECURITY_CLASSIFICATIONS: readonly SecurityClassification[] = [
  "none", "security-relevant", "security-critical",
] as const;

/** Valid trust levels */
export const VALID_TRUST_LEVELS: readonly TrustLevel[] = [
  "system", "project-data", "user-input", "external", "unknown",
] as const;

/** Valid freshness levels */
export const VALID_FRESHNESS_LEVELS: readonly FreshnessLevel[] = [
  "current", "recent", "stale", "unknown",
] as const;

/** Valid evidence status values */
export const VALID_EVIDENCE_STATUSES: readonly EvidenceStatus[] = [
  "valid", "stale", "unknown", "superseded",
] as const;

/* ============================================================================
 * P3.6-C: CONTEXT SELECTION TYPES
 * ========================================================================== */

/** Agent stage affecting context relevance */
export type ContextSelectionStage =
  | "planning"
  | "execution"
  | "verification"
  | "recovery";

/** Why evidence was selected */
export type ContextSelectionReason =
  | "security-critical"
  | "task-direct-match"
  | "execution-dependency"
  | "verification-required"
  | "high-priority"
  | "fresh-evidence"
  | "corroborated"
  | "required-by-policy";

/** Why evidence was dropped */
export type ContextDropReason =
  | "irrelevant"
  | "stale"
  | "superseded"
  | "duplicate"
  | "conflicted"
  | "budget-exceeded"
  | "lower-priority"
  | "trust-restricted"
  | "deferred-progressive-disclosure";

/** Detail level for evidence rendering */
export type EvidenceDetailLevel = "full" | "compressed" | "reference";

/** An evidence item selected for inclusion */
export interface SelectedContextEvidence {
  evidenceId: string;
  score: number;
  reasons: ContextSelectionReason[];
  estimatedTokens: number;
  detailLevel: EvidenceDetailLevel;
}

/** An evidence item dropped from inclusion */
export interface DroppedContextEvidence {
  evidenceId: string;
  reason: ContextDropReason;
  score?: number;
}

/** Result of context selection */
export interface ContextSelectionResult {
  selected: SelectedContextEvidence[];
  dropped: DroppedContextEvidence[];
  deferred: string[];
  totalEstimatedTokens: number;
  tokenBudget: number;
  stage: ContextSelectionStage;
  deterministicHash: string;
  metrics: ContextSelectionMetrics;
}

/** Selection observability metrics */
export interface ContextSelectionMetrics {
  evidenceCollected: number;
  evidenceEligible: number;
  evidenceSelected: number;
  evidenceDropped: number;
  evidenceDeferred: number;
  conflictsDetected: number;
  conflictsUnresolved: number;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  compressionRatio: number;
  selectionDurationMs: number;
  assemblyDurationMs: number;
  budgetUtilization: number;
}

/** Trust rendering policy for assembly */
export type TrustRenderMode =
  | "instruction-compatible"
  | "quoted-evidence"
  | "quoted-request"
  | "untrusted-reference";

/** A reference to deferred evidence */
export interface ContextReference {
  evidenceId: string;
  kind: string;
  summary: string;
  reasonDeferred: string;
  retrievalHint: string;
  availability: "available-now" | "deferred-but-retrievable" | "deferred-not-currently-exposed";
}

/** Progressive disclosure metadata */
export interface ProgressiveDisclosureMetadata {
  totalEvidence: number;
  includedEvidence: number;
  deferredEvidence: number;
  deferredByReason: Record<string, number>;
  retrievableCount: number;
  notRetrievableCount: number;
}

/* ============================================================================
 * P3.6-D: CONTEXT RUNTIME TYPES
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

/** Per-task context metrics */
export interface TaskContextMetrics {
  /** Task identifier */
  taskId: string;

  /** Scope identifier */
  scopeId: string;

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

/** Recovery context integration input */
export interface RecoveryContextInput {
  /** Scope being recovered */
  scopeId: string;

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
