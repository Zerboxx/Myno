/**
 * P3.6-D — Context Lifecycle Management
 *
 * Manages the complete lifecycle of context from creation to finalization.
 * Integrates with P3.6-A/B/C without modifying their contracts.
 */

import type {
  ContextScope,
  ContextScopeId,
  RuntimeContext,
  ContextLifecycleState,
  ContextSelectionStage,
  ContextSelectionResult,
  ContextAuditEvent,
  TaskContextMetrics,
  ContextInvalidationReason,
  ContextEvidenceId,
  ContextEvidence,
} from "../types.js";
import type { ContextSnapshot } from "../snapshot.js";
import type { AssembledContext } from "../assembly.js";
import type { ContextMetrics } from "../types.js";
import { createSnapshot } from "../snapshot.js";
import { assembleContext, renderContextPackage } from "../assembly.js";
import { createReferences } from "../progressive-disclosure.js";
import { ContextMetricsCollector } from "./observability.js";

/* ============================================================================
 * LIFECYCLE MANAGER
 * ========================================================================== */

let scopeCounter = 0;
let eventCounter = 0;

export interface LifecycleManagerConfig {
  /** Maximum generations per task before forced refresh */
  maxGenerations?: number;

  /** Default context timeout (ms) */
  contextTimeoutMs?: number;

  /** Enable audit logging */
  enableAudit?: boolean;

  /** Maximum audit events per scope */
  maxAuditEvents?: number;

  /**
   * Optional observability collector. When provided, every lifecycle
   * audit event and task metric is mirrored into it (production
   * integration of the P3.6-D observability surface).
   */
  metricsCollector?: ContextMetricsCollector;
}

type ResolvedLifecycleConfig = Required<
  Omit<LifecycleManagerConfig, "metricsCollector">
> & { metricsCollector?: ContextMetricsCollector };

const DEFAULT_CONFIG: ResolvedLifecycleConfig = {
  maxGenerations: 10,
  contextTimeoutMs: 30 * 60 * 1000, // 30 minutes
  enableAudit: true,
  maxAuditEvents: 1000,
};

/**
 * Manages context lifecycle from creation to finalization.
 * Single source of truth for context scope state.
 */
export class ContextLifecycleManager {
  private readonly scopes = new Map<ContextScopeId, ContextScope>();
  private readonly runtimeContexts = new Map<ContextScopeId, RuntimeContext>();
  private readonly auditLogs = new Map<ContextScopeId, ContextAuditEvent[]>();
  private readonly metrics = new Map<string, TaskContextMetrics>();
  private readonly config: ResolvedLifecycleConfig;
  private readonly projectFingerprints = new Map<ContextScopeId, string>();
  private readonly metricsCollector?: ContextMetricsCollector;

  constructor(config: LifecycleManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metricsCollector = config.metricsCollector;
  }

  /* ============================================================================
   * SCOPE CREATION
   * ============================================================================ */

  /**
   * Create a new context scope for a task.
   * Called at task start.
   */
  createScope(input: {
    taskId: string;
    parentScopeId?: ContextScopeId;
    projectId?: string;
  }): ContextScope {
    scopeCounter++;
    const scopeId = `scope-${Date.now()}-${scopeCounter}` as ContextScopeId;

    const scope: ContextScope = {
      scopeId,
      taskId: input.taskId,
      parentScopeId: input.parentScopeId,
      projectId: input.projectId,
      createdAt: Date.now(),
      lifecycleState: "created",
      generation: 1,
      evidenceIds: [],
    };

    this.scopes.set(scopeId, scope);
    this.auditLogs.set(scopeId, []);
    this.metrics.set(scopeId, {
      taskId: input.taskId,
      scopeId,
      generations: 1,
      refreshCount: 0,
      invalidationCount: 0,
      guardFailures: 0,
      finalContextHash: "",
      totalLifecycleMs: 0,
      refreshLatencyMs: 0,
      checkpointsEvaluated: 0,
    });

    this.recordAuditEvent(scopeId, input.taskId, 1, "created");

    return scope;
  }

  /**
   * Get a scope by ID.
   */
  getScope(scopeId: ContextScopeId): ContextScope | undefined {
    return this.scopes.get(scopeId);
  }

  /**
   * Get all scopes for a task.
   */
  getScopesForTask(taskId: string): ContextScope[] {
    return Array.from(this.scopes.values()).filter(s => s.taskId === taskId);
  }

  /**
   * Register an existing scope (created by ContextScopeManager) with the lifecycle manager.
   * This allows sharing a single canonical scope between both managers.
   */
  registerScope(scope: ContextScope): void {
    this.scopes.set(scope.scopeId, scope);
    this.auditLogs.set(scope.scopeId, []);
    this.metrics.set(scope.scopeId, {
      taskId: scope.taskId,
      scopeId: scope.scopeId,
      generations: scope.generation,
      refreshCount: 0,
      invalidationCount: 0,
      guardFailures: 0,
      finalContextHash: "",
      totalLifecycleMs: 0,
      refreshLatencyMs: 0,
      checkpointsEvaluated: 0,
    });
    this.recordAuditEvent(scope.scopeId, scope.taskId, scope.generation, "created");
  }

  /* ============================================================================
   * EVIDENCE COLLECTION
   * ============================================================================ */

  /**
   * Record evidence collection for a scope.
   * Called after P3.6-B pipeline completes.
   */
  recordCollection(scopeId: ContextScopeId, evidenceIds: ContextEvidenceId[]): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) return;

    scope.evidenceIds = Object.freeze([...evidenceIds]);
    scope.lifecycleState = "collecting";
    this.recordAuditEvent(scopeId, scope.taskId, scope.generation, "collected", {
      evidenceCount: evidenceIds.length,
    });
  }

  /* ============================================================================
   * SNAPSHOT & ASSEMBLY
   * ============================================================================ */

  /**
   * Create snapshot and assemble context for a stage.
   * Returns the assembled runtime context.
   */
  async assembleForStage(input: {
    scopeId: ContextScopeId;
    collection: {
      evidence: Array<{ id: ContextEvidenceId; [key: string]: unknown }>;
      metadata: { taskId: string; estimatedTokens: number };
    };
    selection: ContextSelectionResult;
    stage: ContextSelectionStage;
    projectFingerprint?: string;
  }): Promise<RuntimeContext> {
    const scope = this.scopes.get(input.scopeId);
    if (!scope) throw new Error(`Scope not found: ${input.scopeId}`);

    // Explicit state machine step: INVALIDATED/REFRESHING -> VALIDATING.
    // The scope only becomes ACTIVE through completeRefresh() AFTER the
    // ContextGuard validates the freshly assembled runtime context.
    scope.lifecycleState = "validating";

    // Create snapshot
    const snapshot = createSnapshot({
      collectionId: `col-${scope.taskId}`,
      projectFingerprint: input.projectFingerprint ?? "unknown",
      evidenceIds: input.collection.evidence.map(e => e.id),
      metadata: {
        taskId: input.collection.metadata.taskId,
        createdAt: Date.now(),
        evidenceCount: input.collection.metadata.estimatedTokens,
        estimatedTokens: input.collection.metadata.estimatedTokens,
        securityCriticalCount: 0,
        sourceTypeCounts: {} as any,
        kindCounts: {} as any,
        schemaVersion: 1,
      },
      pipelineMetrics: {
        totalEvidence: input.collection.evidence.length,
        validEvidence: input.selection.selected.length,
        invalidEvidence: input.selection.dropped.length,
        duplicateGroups: 0,
        staleEvidenceCount: 0,
        collectorFailures: [],
        collectionDurationMs: 0,
      },
    });

    // Create references for deferred evidence
    const references = createReferences(
      input.collection.evidence as any,
      input.selection.deferred,
      input.stage,
    );

    // Assemble context package
    const assembled = assembleContext(
      input.collection as any,
      input.selection,
      references,
      input.stage,
    );

    const assemblyString = renderContextPackage(assembled);
    const assemblyHash = this.computeAssemblyHash(assemblyString);

    // Create runtime context
    const runtimeContext: RuntimeContext = {
      scope,
      snapshotId: snapshot.metadata.taskId,
      generation: scope.generation,
      stage: input.stage,
      assemblyHash,
      assembly: assemblyString,
      evidenceIds: Object.freeze([...input.selection.selected.map(s => s.evidenceId)]),
      createdAt: Date.now(),
      frozenAt: Date.now(),
      status: "active",
    };

    scope.lifecycleState = "validating";
    scope.snapshotId = snapshot.metadata.taskId;
    scope.assemblyHash = assemblyHash;
    scope.currentStage = input.stage;
    scope.frozenAt = runtimeContext.frozenAt;

    if (input.projectFingerprint) {
      this.projectFingerprints.set(input.scopeId, input.projectFingerprint);
    }

    this.runtimeContexts.set(input.scopeId, runtimeContext);
    this.recordAuditEvent(input.scopeId, scope.taskId, scope.generation, "assembled", {
      stage: input.stage,
      assemblyHash,
    });
    this.recordAuditEvent(input.scopeId, scope.taskId, scope.generation, "frozen", {
      stage: input.stage,
    });
    this.recordAuditEvent(input.scopeId, scope.taskId, scope.generation, "activated", {
      stage: input.stage,
    });

    return runtimeContext;
  }

  /**
   * Get the current runtime context for a scope.
   */
  getRuntimeContext(scopeId: ContextScopeId): RuntimeContext | undefined {
    return this.runtimeContexts.get(scopeId);
  }

  /* ============================================================================
   * STAGE TRANSITION
   * ============================================================================ */

  /**
   * Transition context to a new stage.
   * Re-assembles if needed.
   */
  async transitionStage(input: {
    scopeId: ContextScopeId;
    newStage: ContextSelectionStage;
    collection: any;
    selection: ContextSelectionResult;
    projectFingerprint?: string;
  }): Promise<RuntimeContext> {
    const scope = this.scopes.get(input.scopeId);
    if (!scope) throw new Error(`Scope not found: ${input.scopeId}`);

    const oldRuntime = this.runtimeContexts.get(input.scopeId);
    if (oldRuntime) {
      oldRuntime.status = "superseded";
    }

    // Re-assemble for new stage
    const runtimeContext = await this.assembleForStage({
      scopeId: input.scopeId,
      collection: input.collection,
      selection: input.selection,
      stage: input.newStage,
      projectFingerprint: input.projectFingerprint,
    });

    scope.currentStage = input.newStage;
    scope.generation++;
    scope.evidenceIds = Object.freeze([...input.selection.selected.map(s => s.evidenceId)]);

    const metrics = this.metrics.get(input.scopeId);
    if (metrics) {
      metrics.generations = scope.generation;
    }

    this.recordAuditEvent(input.scopeId, scope.taskId, scope.generation, "checkpoint", {
      stage: input.newStage,
      previousGeneration: scope.generation - 1,
    });

    // Self-contained transition: validate + activate immediately.
    this.completeRefresh(input.scopeId);

    return runtimeContext;
  }

  /* ============================================================================
   * FINALIZATION
   * ============================================================================ */

  /**
   * Finalize a context scope.
   * Called when task completes.
   */
  finalizeScope(scopeId: ContextScopeId): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) return;

    const runtime = this.runtimeContexts.get(scopeId);
    if (runtime) {
      runtime.status = "completed";
    }

    scope.lifecycleState = "completed";

    const metrics = this.metrics.get(scopeId);
    if (metrics) {
      metrics.finalContextHash = runtime?.assemblyHash ?? "";
      metrics.totalLifecycleMs = Date.now() - scope.createdAt;
    }

    this.recordAuditEvent(scopeId, scope.taskId, scope.generation, "finalized");
  }

  /**
   * Mark scope as failed.
   */
  failScope(scopeId: ContextScopeId, reason?: string): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) return;

    scope.lifecycleState = "failed";
    this.recordAuditEvent(scopeId, scope.taskId, scope.generation, "failed", { reason });
  }

  /* ============================================================================
   * INVALIDATION
   * ============================================================================ */

  /**
   * Invalidate a context scope.
   */
  invalidateScope(scopeId: ContextScopeId, reason: ContextInvalidationReason): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) return;

    const runtime = this.runtimeContexts.get(scopeId);
    if (runtime) {
      runtime.status = "invalidated";
      runtime.invalidationReason = reason;
    }

    scope.lifecycleState = "invalidated";
    scope.invalidationReason = reason;

    const metrics = this.metrics.get(scopeId);
    if (metrics) {
      metrics.invalidationCount++;
    }

    this.recordAuditEvent(scopeId, scope.taskId, scope.generation, "invalidated", { reason });
  }

  /* ============================================================================
   * REFRESH
   * ============================================================================ */

  /**
   * Refresh a context scope (increment generation).
   * Returns the new generation number.
   */
  refreshScope(scopeId: ContextScopeId, reason: string): number {
    const scope = this.scopes.get(scopeId);
    if (!scope) throw new Error(`Scope not found: ${scopeId}`);

    const oldRuntime = this.runtimeContexts.get(scopeId);
    if (oldRuntime) {
      oldRuntime.status = "superseded";
    }

    scope.generation++;
    scope.lifecycleState = "refreshing";

    const metrics = this.metrics.get(scopeId);
    if (metrics) {
      metrics.generations = scope.generation;
      metrics.refreshCount++;
    }

    this.recordAuditEvent(scopeId, scope.taskId, scope.generation, "refresh-requested", { reason });
    this.recordAuditEvent(scopeId, scope.taskId, scope.generation, "refreshed", { reason });

    return scope.generation;
  }

  /**
   * Explicitly enter the VALIDATING state (between refresh and assembly).
   * Guards validation: the scope is not injectable in this state.
   */
  beginValidation(scopeId: ContextScopeId): boolean {
    const scope = this.scopes.get(scopeId);
    if (!scope) return false;
    if (
      scope.lifecycleState === "completed" ||
      scope.lifecycleState === "failed"
    ) {
      return false;
    }

    scope.lifecycleState = "validating";
    this.recordAuditEvent(scopeId, scope.taskId, scope.generation, "validated", {
      state: "validating",
    });
    return true;
  }

  /**
   * Mark refresh as complete.
   * The scope becomes ACTIVE only here — after guard validation.
   */
  completeRefresh(scopeId: ContextScopeId): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) return;

    scope.lifecycleState = "active";
    this.recordAuditEvent(scopeId, scope.taskId, scope.generation, "refreshed");
  }

  /* ============================================================================
   * PROJECT FINGERPRINT
   * ============================================================================ */

  /**
   * Record project fingerprint for mutation detection.
   */
  setProjectFingerprint(scopeId: ContextScopeId, fingerprint: string): void {
    const existing = this.projectFingerprints.get(scopeId);
    this.projectFingerprints.set(scopeId, fingerprint);

    if (existing && existing !== fingerprint) {
      this.recordAuditEvent(scopeId, this.scopes.get(scopeId)?.taskId ?? "", 
        this.scopes.get(scopeId)?.generation ?? 0, "checkpoint", {
        fingerprintChanged: true,
        oldFingerprint: existing.slice(0, 8),
        newFingerprint: fingerprint.slice(0, 8),
      });
    }
  }

  /**
   * Get stored project fingerprint.
   */
  getProjectFingerprint(scopeId: ContextScopeId): string | undefined {
    return this.projectFingerprints.get(scopeId);
  }

  /* ============================================================================
   * AUDIT
   * ============================================================================ */

/**
   * Record an audit event.
   */
  recordAuditEvent(
    scopeId: ContextScopeId,
    taskId: string,
    generation: number,
    event: ContextAuditEvent["event"],
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.config.enableAudit) return;

    const logs = this.auditLogs.get(scopeId) ?? [];
    eventCounter++;

    logs.push({
      eventId: `evt-${Date.now()}-${eventCounter}`,
      scopeId,
      taskId,
      generation,
      event,
      timestamp: Date.now(),
      metadata,
    });

    if (logs.length > this.config.maxAuditEvents) {
      logs.splice(0, logs.length - this.config.maxAuditEvents);
    }

    this.auditLogs.set(scopeId, logs);

    // Mirror into the observability collector when configured.
    if (this.metricsCollector) {
      try {
        this.metricsCollector.recordAuditEvent({
          eventId: logs[logs.length - 1].eventId,
          scopeId,
          taskId,
          generation,
          event,
          timestamp: Date.now(),
          metadata,
        } as ContextAuditEvent);
        const metrics = this.metrics.get(scopeId);
        if (metrics) {
          this.metricsCollector.recordTaskMetrics(metrics);
        }
      } catch {
        // Observability must never break lifecycle operations.
      }
    }
  }

  /**
   * Get audit log for a scope.
   */
  getAuditLog(scopeId: ContextScopeId): ContextAuditEvent[] {
    return this.auditLogs.get(scopeId) ?? [];
  }

  /**
   * Get metrics for a scope.
   */
  getMetrics(scopeId: ContextScopeId): TaskContextMetrics | undefined {
    return this.metrics.get(scopeId);
  }

  /**
   * Get aggregated metrics.
   */
  getAggregatedMetrics(): ContextMetrics {
    const metrics = Array.from(this.metrics.values());
    return {
      contextsCreated: metrics.length,
      contextsRefreshed: metrics.reduce((sum, m) => sum + m.refreshCount, 0),
      contextsInvalidated: metrics.reduce((sum, m) => sum + m.invalidationCount, 0),
      guardRejections: metrics.reduce((sum, m) => sum + m.guardFailures, 0),
      avgGenerationsPerTask: metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.generations, 0) / metrics.length
        : 0,
      avgRefreshLatencyMs: metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.refreshLatencyMs, 0) / metrics.length
        : 0,
      staleContextsDetected: 0, // Would be tracked by checkpoint system
      securityContextRefreshes: 0, // Would be tracked by refresh system
      crossScopeReuseAttempts: 0,
      crossScopeReuses: 0,
    };
  }

  /* ============================================================================
   * INTEGRITY
   * ============================================================================ */

  private computeAssemblyHash(assembly: string): string {
    // Simple deterministic hash (not cryptographic)
    let hash = 0;
    for (let i = 0; i < assembly.length; i++) {
      const char = assembly.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `asm-${Math.abs(hash).toString(16)}`;
  }

  /* ============================================================================
   * CLEANUP
   * ============================================================================ */

  /**
   * Clean up old scopes (for long-running processes).
   */
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [scopeId, scope] of this.scopes) {
      if (scope.lifecycleState === "completed" || scope.lifecycleState === "failed") {
        if (now - scope.createdAt > maxAgeMs) {
          this.scopes.delete(scopeId);
          this.runtimeContexts.delete(scopeId);
          this.auditLogs.delete(scopeId);
          this.metrics.delete(scopeId);
          this.projectFingerprints.delete(scopeId);
          cleaned++;
        }
      }
    }

    return cleaned;
  }
}

/* ============================================================================
 * STANDALONE FUNCTION EXPORTS
 * ========================================================================== */

export const scopes = new Map<ContextScopeId, ContextScope>();

export function createScope(input: {
  taskId: string;
  parentScopeId?: ContextScopeId;
  projectId?: string;
}): ContextScope {
  const manager = new ContextLifecycleManager();
  return manager.createScope(input);
}

export function getScope(scopeId: ContextScopeId): ContextScope | undefined {
  const manager = new ContextLifecycleManager();
  return manager.getScope(scopeId);
}