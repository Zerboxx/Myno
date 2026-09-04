/**
 * P3.5.1 — Intelligence Cache & Project Map Cache
 *
 * Caches deterministic intelligence results to avoid redundant computation.
 * Optimizes project map reuse with change detection.
 */

import type { ProjectMap } from "../project-map/types.js";
import type { TaskIntelligence } from "./orchestrator.js";
import type { TaskComplexity } from "./budget.js";

/* ============================================================================
 * CACHE ENTRY
 * ========================================================================== */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  /** Hash of the project state at time of caching */
  projectHash: string;
  /** Task category that produced this result */
  taskCategory: string;
  /** Engine that produced this result */
  engine: string;
  /** Scope of analysis (e.g., "full-project", "scripts-only") */
  scope: string;
}

/* ============================================================================
 * INTELLIGENCE RESULT CACHE
 * ========================================================================== */

export class IntelligenceCache {
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly maxAge: number;
  private readonly maxSize: number;

  constructor(options: { maxAgeMs?: number; maxSize?: number } = {}) {
    this.maxAge = options.maxAgeMs ?? 120_000; // 2 minutes default
    this.maxSize = options.maxSize ?? 100;
  }

  /**
   * Generate a cache key from task context.
   */
  static cacheKey(engine: string, projectHash: string, taskCategory: string, scope: string): string {
    return `${engine}:${projectHash}:${taskCategory}:${scope}`;
  }

  /**
   * Get a cached result if valid.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check age
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Store a result in cache.
   */
  set<T>(key: string, value: T, meta: { projectHash: string; taskCategory: string; engine: string; scope: string }): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.findOldest();
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      projectHash: meta.projectHash,
      taskCategory: meta.taskCategory,
      engine: meta.engine,
      scope: meta.scope,
    });
  }

  /**
   * Invalidate all entries matching a project hash.
   */
  invalidateProject(projectHash: string): number {
    let count = 0;
    for (const [key, entry] of this.cache) {
      if (entry.projectHash === projectHash) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate entries for a specific engine.
   */
  invalidateEngine(engine: string): number {
    let count = 0;
    for (const [key] of this.cache) {
      if (key.startsWith(`${engine}:`)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Tracked externally
    };
  }

  private findOldest(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    return oldestKey;
  }
}

/* ============================================================================
 * PROJECT MAP CACHE
 * ========================================================================== */

export class ProjectMapCache {
  private currentMap: ProjectMap | null = null;
  private lastHash: string = "";
  private lastLoadTime: number = 0;
  private readonly cacheTtlMs: number;

  constructor(options: { cacheTtlMs?: number } = {}) {
    this.cacheTtlMs = options.cacheTtlMs ?? 60_000;
  }

  /**
   * Get cached project map if fresh enough.
   */
  get(): ProjectMap | null {
    if (!this.currentMap) return null;
    if (Date.now() - this.lastLoadTime > this.cacheTtlMs) {
      return null; // Expired
    }
    return this.currentMap;
  }

  /**
   * Store a project map.
   */
  set(map: ProjectMap): void {
    this.currentMap = map;
    this.lastHash = this.computeHash(map);
    this.lastLoadTime = Date.now();
  }

  /**
   * Check if a project map has changed since last cache.
   */
  hasChanged(map: ProjectMap): boolean {
    const newHash = this.computeHash(map);
    return newHash !== this.lastHash;
  }

  /**
   * Get the current hash.
   */
  getHash(): string {
    return this.lastHash;
  }

  /**
   * Force invalidation.
   */
  invalidate(): void {
    this.currentMap = null;
    this.lastHash = "";
    this.lastLoadTime = 0;
  }

  /**
   * Compute a lightweight hash of project state.
   * Uses instance count, script count, and remote count as a fast change detector.
   */
  private computeHash(map: ProjectMap): string {
    const parts = [
      map.instances?.length ?? 0,
      map.scripts?.length ?? 0,
      map.remotes?.length ?? 0,
      map.services?.services?.size ?? 0,
      map.uiHierarchy?.screenGuis?.length ?? 0,
      // Include a sampling of instance names for change detection
      (map.instances ?? []).slice(0, 10).map(i => i.name).join(","),
    ];
    return parts.join(":");
  }
}

/* ============================================================================
 * INTELLIGENCE METRICS
 * ========================================================================== */

export interface IntelligenceMetrics {
  taskId: string;
  stage: string;
  engine: string;
  durationMs: number;
  cacheHit: boolean;
  cacheKey: string;
  scope: string;
  resultStatus: "success" | "timeout" | "error" | "budget-exceeded" | "cached";
  failureCategory?: string;
  escalation?: string;
  budgetRemaining?: { engines: number; inspections: number; latencyMs: number };
}

export class MetricsCollector {
  private readonly metrics: IntelligenceMetrics[] = [];
  private readonly maxMetrics: number;

  constructor(options: { maxMetrics?: number } = {}) {
    this.maxMetrics = options.maxMetrics ?? 500;
  }

  record(metric: IntelligenceMetrics): void {
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics.shift(); // Drop oldest
    }
    this.metrics.push(metric);
  }

  getForTask(taskId: string): IntelligenceMetrics[] {
    return this.metrics.filter(m => m.taskId === taskId);
  }

  getSummary(): {
    totalTasks: number;
    avgLatencyMs: number;
    cacheHitRate: number;
    enginesInvoked: number;
    budgetExceededCount: number;
  } {
    const tasks = new Set(this.metrics.map(m => m.taskId));
    const totalLatency = this.metrics.reduce((sum, m) => sum + m.durationMs, 0);
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const budgetExceeded = this.metrics.filter(m => m.resultStatus === "budget-exceeded").length;

    return {
      totalTasks: tasks.size,
      avgLatencyMs: this.metrics.length > 0 ? totalLatency / this.metrics.length : 0,
      cacheHitRate: this.metrics.length > 0 ? cacheHits / this.metrics.length : 0,
      enginesInvoked: this.metrics.filter(m => m.resultStatus === "success").length,
      budgetExceededCount: budgetExceeded,
    };
  }

  clear(): void {
    this.metrics.length = 0;
  }
}
