/**
 * P3.5 — Experience Records
 *
 * Records of agent execution experiences for learning and improvement.
 */

import type { TaskContext } from "../task-context.js";
import type { AgentPlan, AgentPlanStep } from "../plan-types.js";
import type { VerificationState } from "../execution-types.js";

/** Lesson learned */
export interface Lesson {
  id: string;
  category: string;
  summary: string;
  details: string;
  confidence: number;
  applicableWhen: string;
  source: string;
}

/** Experience Record */
export interface ExperienceRecord {
  id: string;
  taskId: string;
  projectId: string;
  timestamp: number;

  /** Task information */
  task: {
    intent: string;
    domain: string;
    objective: string;
    complexity: "low" | "medium" | "high";
  };

  /** Plan executed */
  plan: {
    goal: string;
    steps: ExperiencePlanStep[];
    successCriteria: string[];
  };

  /** Execution details */
  execution: {
    durationMs: number;
    iterations: number;
    toolCalls: number;
    successfulTools: number;
    failedTools: number;
    totalTokens: number;
    cost: number;
  };

  /** Outcome */
  outcome: {
    success: boolean;
    completed: boolean;
    failed: boolean;
    cancelled: boolean;
    summary: string;
    verification: VerificationResult;
    failureReason?: string;
    error?: string;
  };

  /** Verification result */
  verification: VerificationResult;

  /** Observations */
  observations: ExperienceObservation[];

  /** Errors and failures */
  failures: ExperienceFailure[];

  /** Recovery actions */
  recoveries: RecoveryAction[];

  /** Quality metrics */
  quality: QualityMetrics;

  /** Lessons learned */
  lessons: Lesson[];

  /** Tags for categorization */
  tags: string[];

  /** Confidence in the record accuracy */
  confidence: number;
}

/** Plan step in experience */
export interface ExperiencePlanStep {
  id: string;
  description: string;
  status: "pending" | "active" | "completed" | "failed" | "skipped";
  durationMs: number;
  toolsUsed: string[];
  verification: VerificationResult;
}

/** Verification result */
export interface VerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
  evidence: string[];
  reason?: string;
}

/** Verification check */
export interface VerificationCheck {
  id: string;
  description: string;
  passed: boolean;
  evidence: string[];
  severity: "required" | "optional";
}

/** Observation */
export interface ExperienceObservation {
  id: string;
  timestamp: number;
  type: "observation" | "decision" | "discovery" | "issue" | "insight";
  summary: string;
  details?: string;
  relatedStepId?: string;
  confidence: number;
}

/** Failure record */
export interface ExperienceFailure {
  id: string;
  stepId?: string;
  type: "tool" | "verification" | "planning" | "execution" | "timeout" | "cancellation";
  tool?: string;
  error: string;
  severity: "low" | "medium" | "high" | "critical";
  recovered: boolean;
  recoveryAction?: string;
  rootCause?: string;
}

/** Recovery action */
export interface RecoveryAction {
  id: string;
  failureId: string;
  type: "retry" | "replan" | "tool_change" | "parameter_adjustment" | "inspection" | "manual";
  description: string;
  success: boolean;
  durationMs: number;
}

/** Quality metrics */
export interface QualityMetrics {
  /** Overall quality score (0-100) */
  overall: number;

  /** Correctness score */
  correctness: number;

  /** Architecture score */
  architecture: number;

  /** Security score */
  security: number;

  /** Performance score */
  performance: number;

  /** Maintainability score */
  maintainability: number;

  /** Visual quality score */
  visual: number;

  /** UX quality score */
  ux: number;

  /** Verification thoroughness */
  verification: number;

  /** Recovery effectiveness */
  recovery: number;

  /** Efficiency score */
  efficiency: number;
}

/** Experience store interface */
export interface ExperienceStore {
  /** Save experience record */
  save(record: ExperienceRecord): Promise<void>;

  /** Get experience by ID */
  get(id: string): Promise<ExperienceRecord | null>;

  /** Query experiences */
  query(query: ExperienceQuery): Promise<ExperienceQueryResult>;

  /** Get statistics */
  getStats(projectId?: string): Promise<ExperienceStats>;

  /** Close store */
  close(): Promise<void>;
}

/** Experience query */
export interface ExperienceQuery {
  projectId?: string;
  taskId?: string;
  success?: boolean;
  tags?: string[];
  dateRange?: { from: number; to: number };
  minQuality?: number;
  limit?: number;
  offset?: number;
}

/** Experience query result */
export interface ExperienceQueryResult {
  records: ExperienceRecord[];
  total: number;
  hasMore: boolean;
}

/** Experience statistics */
export interface ExperienceStats {
  totalRecords: number;
  successRate: number;
  averageQuality: number;
  averageDuration: number;
  commonFailureModes: { type: string; count: number }[];
  topTags: { tag: string; count: number }[];
  averageRecoveryTime: number;
}

/** Experience Store Implementation */
export class ExperienceStoreImpl {
  private readonly store: Map<string, ExperienceRecord> = new Map();
  private readonly byProject: Map<string, Set<string>> = new Map();
  private readonly byTag: Map<string, Set<string>> = new Map();

  async save(record: ExperienceRecord): Promise<void> {
    this.store.set(record.id, record);

    // Index by project
    const projectSet = this.byProject.get(record.projectId) || new Set();
    projectSet.add(record.id);
    this.byProject.set(record.projectId, projectSet);

    // Index by tags
    for (const tag of record.tags) {
      const tagSet = this.byTag.get(tag) || new Set();
      tagSet.add(record.id);
      this.byTag.set(tag, tagSet);
    }
  }

  async get(id: string): Promise<any | null> {
    return this.store.get(id) || null;
  }

  async query(query: any): Promise<any> {
    let results: any[] = [];

    if (query.projectId) {
      const projectIds = this.byProject.get(query.projectId) || new Set();
      results = Array.from(projectIds).map(id => this.store.get(id)).filter(Boolean);
    } else {
      results = Array.from(this.store.values());
    }

    // Filter by success
    if (query.success !== undefined) {
      results = results.filter(r => r.outcome.success === query.success);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(r => query.tags!.some((t: string) => r.tags.includes(t)));
    }

    // Filter by date range
    if (query.dateRange) {
      results = results.filter(r =>
        r.timestamp >= query.dateRange!.from && r.timestamp <= query.dateRange!.to
      );
    }

    // Filter by min quality
    if (query.minQuality) {
      results = results.filter(r => r.quality.overall >= query.minQuality!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply offset and limit
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginated = results.slice(offset, offset + limit);

    return {
      records: paginated,
      total: results.length,
      hasMore: offset + limit < results.length,
    };
  }

  async getStats(projectId?: string): Promise<any> {
    let records: any[] = [];

    if (projectId) {
      const ids = this.byProject.get(projectId) || new Set();
      records = Array.from(ids).map(id => this.store.get(id)).filter(Boolean);
    } else {
      records = Array.from(this.store.values());
    }

    if (records.length === 0) {
      return {
        totalRecords: 0,
        successRate: 0,
        averageQuality: 0,
        averageDuration: 0,
        commonFailureModes: [],
        topTags: [],
        averageRecoveryTime: 0,
      };
    }

    const successful = records.filter(r => r.outcome.success).length;
    const totalQuality = records.reduce((sum, r) => sum + r.quality.overall, 0);
    const totalDuration = records.reduce((sum, r) => sum + r.execution.durationMs, 0);

    const failureModes: Record<string, number> = {};
    for (const record of records) {
      for (const failure of record.failures) {
        failureModes[failure.type] = (failureModes[failure.type] || 0) + 1;
      }
    }

    const tagCounts: Record<string, number> = {};
    for (const record of records) {
      for (const tag of record.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const failureModeEntries = Object.entries(failureModes)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    const totalRecoveryTime = records.reduce((sum, r) => {
      const recoveryTime = r.recoveries.reduce((s: number, rec: any) => s + rec.durationMs, 0);
      return sum + recoveryTime;
    }, 0);

    return {
      totalRecords: records.length,
      successRate: successful / records.length,
      averageQuality: totalQuality / records.length,
      averageDuration: totalDuration / records.length,
      commonFailureModes: failureModeEntries,
      topTags,
      averageRecoveryTime: totalRecoveryTime / records.length,
    };
  }

  async close(): Promise<void> {
    this.store.clear();
    this.byProject.clear();
    this.byTag.clear();
  }
}

/**
 * Creates an experience store
 */
export function createExperienceStore(): ExperienceStore {
  return new ExperienceStoreImpl();
}