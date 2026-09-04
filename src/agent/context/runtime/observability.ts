/**
 * P3.6-D — Context Observability
 *
 * Metrics and monitoring for context lifecycle.
 * Integrates with P3.5.1 MetricsCollector where practical.
 */

import type {
  TaskContextMetrics,
  ContextMetrics,
  ContextScopeId,
  ContextAuditEvent,
  ContextAuditEventType,
} from "./types.js";

/* ============================================================================
 * CONTEXT METRICS COLLECTOR
 * ========================================================================== */

/**
 * Collects and aggregates context lifecycle metrics.
 * Designed to integrate with P3.5.1 MetricsCollector.
 */
export class ContextMetricsCollector {
  private readonly taskMetrics = new Map<string, TaskContextMetrics>();
  private readonly auditEvents: ContextAuditEvent[] = [];
  private readonly eventCounts = new Map<ContextAuditEventType, number>();
  private maxAuditEvents = 10000;

  /**
   * Record a task context metric.
   */
  recordTaskMetrics(metrics: TaskContextMetrics): void {
    this.taskMetrics.set(metrics.taskId, metrics);
  }

  /**
   * Get metrics for a specific task.
   */
  getTaskMetrics(taskId: string): TaskContextMetrics | undefined {
    return this.taskMetrics.get(taskId);
  }

  /**
   * Get all task metrics.
   */
  getAllTaskMetrics(): TaskContextMetrics[] {
    return Array.from(this.taskMetrics.values());
  }

  /**
   * Record an audit event.
   */
  recordAuditEvent(event: ContextAuditEvent): void {
    this.auditEvents.push(event);
    this.eventCounts.set(event.event, (this.eventCounts.get(event.event) ?? 0) + 1);

    // Trim if too many
    if (this.auditEvents.length > this.maxAuditEvents) {
      this.auditEvents.splice(0, this.auditEvents.length - this.maxAuditEvents);
    }
  }

  /**
   * Get audit events for a scope.
   */
  getAuditEvents(scopeId: string): ContextAuditEvent[] {
    return this.auditEvents.filter(e => e.scopeId === scopeId);
  }

  /**
   * Get all audit events.
   */
  getAllAuditEvents(): ContextAuditEvent[] {
    return [...this.auditEvents];
  }

  /**
   * Get event counts by type.
   */
  getEventCounts(): Map<ContextAuditEventType, number> {
    return new Map(this.eventCounts);
  }

  /**
   * Compute aggregated metrics.
   */
  getAggregatedMetrics(): ContextMetrics {
    const metrics = Array.from(this.taskMetrics.values());

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
      staleContextsDetected: this.eventCounts.get("checkpoint") ?? 0,
      securityContextRefreshes: 0, // Would need separate tracking
      crossScopeReuseAttempts: 0,
      crossScopeReuses: 0,
    };
  }

  /**
   * Get metrics for a specific scope.
   */
  getScopeMetrics(scopeId: string): Partial<TaskContextMetrics> | undefined {
    // Find task metrics that contain this scope
    // This is a simplification - in full implementation would track by scope
    for (const metrics of this.taskMetrics.values()) {
      if (metrics.scopeId === scopeId) {
        return metrics;
      }
    }
    return undefined;
  }

  /**
   * Reset all metrics (for testing).
   */
  reset(): void {
    this.taskMetrics.clear();
    this.auditEvents.length = 0;
    this.eventCounts.clear();
  }

  /**
   * Export metrics for external monitoring.
   */
  export(): {
    tasks: TaskContextMetrics[];
    aggregated: ContextMetrics;
    eventCounts: Record<string, number>;
  } {
    return {
      tasks: this.getAllTaskMetrics(),
      aggregated: this.getAggregatedMetrics(),
      eventCounts: Object.fromEntries(this.eventCounts),
    };
  }
}

/* ============================================================================
 * P3.5.1 INTEGRATION
 * ========================================================================== */

/**
 * Adapter to integrate with P3.5.1 MetricsCollector.
 * Reuses existing infrastructure where possible.
 */
export class P351MetricsAdapter {
  private readonly p351Collector: any; // Would be MetricsCollector from P3.5.1

  constructor(p351Collector: any) {
    this.p351Collector = p351Collector;
  }

  /**
   * Record context lifecycle metrics to P3.5.1 collector.
   * Uses existing IntelligenceMetrics structure where compatible.
   */
  recordContextLifecycle(metrics: {
    taskId: string;
    stage: string;
    scopeId: string;
    generation: number;
    evidenceCount: number;
    tokenCount: number;
    durationMs: number;
    cacheHit: boolean;
    resultStatus: "success" | "timeout" | "error" | "refreshed" | "invalidated";
  }): void {
    if (!this.p351Collector) return;

    // Map to existing IntelligenceMetrics structure
    // This is a best-effort mapping - some fields may not align perfectly
    const intelMetrics = {
      taskId: metrics.taskId,
      stage: metrics.stage,
      engine: "context-lifecycle",
      durationMs: metrics.durationMs,
      cacheHit: metrics.cacheHit,
      cacheKey: `context-${metrics.scopeId}-gen${metrics.generation}`,
      scope: "context-lifecycle",
      resultStatus: metrics.resultStatus,
      budgetRemaining: {
        engines: 1,
        inspections: 1,
        latencyMs: Math.max(0, 5000 - metrics.durationMs),
      },
    };

    try {
      this.p351Collector.record(intelMetrics);
    } catch {
      // Non-blocking - don't let metrics collection break the agent
    }
  }

  /**
   * Record context guard result.
   */
  recordGuardResult(metrics: {
    taskId: string;
    scopeId: string;
    allowed: boolean;
    reasons: string[];
    warnings: string[];
  }): void {
    if (!this.p351Collector) return;

    try {
      this.p351Collector.record({
        taskId: metrics.taskId,
        stage: "context-guard",
        engine: "context-guard",
        durationMs: 0,
        cacheHit: false,
        cacheKey: `guard-${metrics.scopeId}`,
        scope: "context-security",
        resultStatus: metrics.allowed ? "success" : "error",
        failureCategory: metrics.allowed ? undefined : "guard-rejection",
      });
    } catch {
      // Non-blocking
    }
  }
}

/* ============================================================================
 * REAL-TIME METRICS
 * ========================================================================== */

/**
 * Real-time metrics for dashboard/monitoring.
 */
export class RealtimeContextMetrics {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  /**
   * Increment a counter.
   */
  incrementCounter(name: string, value: number = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  /**
   * Set a gauge value.
   */
  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  /**
   * Record a histogram value.
   */
  recordHistogram(name: string, value: number): void {
    const values = this.histograms.get(name) ?? [];
    values.push(value);
    // Keep last 1000 values
    if (values.length > 1000) values.shift();
    this.histograms.set(name, values);
  }

  /**
   * Get counter value.
   */
  getCounter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  /**
   * Get gauge value.
   */
  getGauge(name: string): number {
    return this.gauges.get(name) ?? 0;
  }

  /**
   * Get histogram statistics.
   */
  getHistogramStats(name: string): { count: number; min: number; max: number; avg: number; p50: number; p95: number } | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sum / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
    };
  }

  /**
   * Get all current metrics.
   */
  getAll(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, { count: number; min: number; max: number; avg: number }>;
  } {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([name, values]) => {
          const stats = this.getHistogramStats(name)!;
          return [name, { count: stats.count, min: stats.min, max: stats.max, avg: stats.avg }];
        })
      ),
    };
  }

  /**
   * Reset all metrics.
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

/* ============================================================================
 * STANDARD METRIC NAMES
 * ========================================================================== */

export const CONTEXT_METRIC_NAMES = {
  // Counters
  CONTEXTS_CREATED: "context.contexts_created",
  CONTEXTS_REFRESHED: "context.contexts_refreshed",
  CONTEXTS_INVALIDATED: "context.contexts_invalidated",
  CONTEXTS_FINALIZED: "context.contexts_finalized",
  GUARD_REJECTIONS: "context.guard_rejections",
  CHECKPOINTS_EVALUATED: "context.checkpoints_evaluated",
  REFRESHES_TRIGGERED: "context.refreshes_triggered",
  SECURITY_REFRESHES: "context.security_refreshes",
  CROSS_SCOPE_REUSE_ATTEMPTS: "context.cross_scope_reuse_attempts",
  CROSS_SCOPE_REUSES: "context.cross_scope_reuses",

  // Gauges
  ACTIVE_CONTEXTS: "context.active_contexts",
  ACTIVE_GENERATIONS: "context.active_generations",
  CONTEXT_EVIDENCE_COUNT: "context.evidence_count",
  CONTEXT_TOKEN_ESTIMATE: "context.token_estimate",
  CONTEXT_ASSEMBLY_HASH: "context.assembly_hash",

  // Histograms
  CONTEXT_CREATION_LATENCY: "context.creation_latency_ms",
  CONTEXT_REFRESH_LATENCY: "context.refresh_latency_ms",
  CONTEXT_ASSEMBLY_LATENCY: "context.assembly_latency_ms",
  CONTEXT_GUARD_LATENCY: "context.guard_latency_ms",
  CHECKPOINT_EVALUATION_LATENCY: "context.checkpoint_latency_ms",
  GENERATIONS_PER_TASK: "context.generations_per_task",
  TOKEN_BUDGET_UTILIZATION: "context.token_budget_utilization",
} as const;