/**
 * P3.5 — Lesson Extraction
 *
 * Extracts structured lessons from execution experiences.
 */

import type { ExperienceRecord, ExperienceFailure, ExperienceObservation } from "../experience/records.js";

/** Lesson */
export interface Lesson {
  id: string;
  timestamp: number;
  projectId: string;

  /** Source experience */
  sourceExperienceId: string;

  /** Lesson content */
  title: string;
  description: string;

  /** Category */
  category: LessonCategory;

  /** Specific context where lesson applies */
  context: LessonContext;

  /** Evidence supporting the lesson */
  evidence: LessonEvidence[];

  /** Confidence in lesson validity (0-1) */
  confidence: number;

  /** Applicability scope */
  scope: LessonScope;

  /** Related lessons */
  relatedLessons: string[];

  /** Counter-indications */
  counterIndications: CounterIndication[];

  /** Actionable guidance */
  actionableGuidance: ActionableGuidance;

  /** Confidence intervals */
  confidenceIntervals: ConfidenceInterval[];

  /** Tags for categorization */
  tags: string[];

  /** Version */
  version: number;

  /** Status */
  status: "draft" | "validated" | "archived" | "superseded";
}

/** Lesson category */
export type LessonCategory =
  | "architecture"
  | "security"
  | "performance"
  | "building"
  | "ui"
  | "scripting"
  | "verification"
  | "recovery"
  | "debugging"
  | "workflow"
  | "convention"
  | "placement"
  | "design";

/** Lesson context */
export interface LessonContext {
  /** Task types where applicable */
  taskTypes: string[];

  /** Project types where applicable */
  projectTypes: string[];

  /** Prerequisites */
  prerequisites: string[];

  /** Conditions where lesson applies */
  conditions: string[];

  /** Exceptions */
  exceptions: string[];
}

/** Lesson evidence */
export interface LessonEvidence {
  type: "experience" | "observation" | "failure" | "success" | "measurement" | "user-feedback";
  sourceId: string;
  description: string;
  strength: number;
}

/** Lesson scope */
export interface LessonScope {
  /** Universality level */
  level: "universal" | "project-specific" | "domain-specific" | "task-specific";

  /** Applicable domains */
  domains: string[];

  /** Applicable task types */
  taskTypes: string[];

  /** Exclusions */
  exclusions: string[];
}

/** Counter-indication */
export interface CounterIndication {
  condition: string;
  reason: string;
  confidence: number;
}

/** Actionable guidance */
export interface ActionableGuidance {
  /** What to do */
  do: string[];

  /** What not to do */
  dont: string[];

  /** When to apply */
  when: string[];

  /** How to verify */
  verification: string[];
}

/** Confidence interval */
export interface ConfidenceInterval {
  metric: string;
  lower: number;
  upper: number;
  confidence: number;
}

/** Lesson extractor */
export class LessonExtractor {
  private readonly logger: any;

  constructor() {
    this.logger = console;
  }

  /**
   * Extract lessons from an experience record
   */
  async extractLessons(record: any): Promise<any[]> {
    const lessons: any[] = [];

    // Extract from failures
    const failureLessons = this.extractFromFailures(record);
    lessons.push(...failureLessons);

    // Extract from successes
    const successLessons = this.extractFromSuccesses(record);
    lessons.push(...successLessons);

    // Extract from observations
    const observationLessons = this.extractFromObservations(record);
    lessons.push(...observationLessons);

    // Extract from recoveries
    const recoveryLessons = this.extractFromRecoveries(record);
    lessons.push(...recoveryLessons);

    // Deduplicate and rank
    return this.deduplicateAndRank(lessons);
  }

  private extractFromFailures(record: any): any[] {
    const lessons: any[] = [];

    for (const failure of record.failures) {
      const lesson = this.createLessonFromFailure(record, failure);
      if (lesson) lessons.push(lesson);
    }

    return lessons;
  }

  private extractFromSuccesses(record: any): any[] {
    const lessons: any[] = [];

    if (record.outcome.success && record.quality.overall > 80) {
      const lesson = this.createLessonFromSuccess(record);
      if (lesson) lessons.push(lesson);
    }

    return lessons;
  }

  private extractFromObservations(record: any): any[] {
    const lessons: any[] = [];

    for (const obs of record.observations) {
      if (obs.type === "insight" && obs.confidence > 0.7) {
        const lesson = this.createLessonFromObservation(record, obs);
        if (lesson) lessons.push(lesson);
      }
    }

    return lessons;
  }

  private extractFromRecoveries(record: any): any[] {
    const lessons: any[] = [];

    for (const recovery of record.recoveries) {
      if (recovery.success) {
        const lesson = this.createLessonFromRecovery(record, recovery);
        if (lesson) lessons.push(lesson);
      }
    }

    return lessons;
  }

  private createLessonFromFailure(record: any, failure: any): any {
    return {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      projectId: record.projectId,
      sourceExperienceId: record.id,
      title: `Avoid ${failure.type} failure: ${failure.error.substring(0, 50)}`,
      description: `When ${failure.type} fails with "${failure.error}", the root cause was ${failure.rootCause || "unknown"}. Recovery: ${failure.recoveryAction || "none"}.`,
      category: this.mapFailureTypeToCategory(failure.type),
      context: {
        taskTypes: [record.task.intent],
        projectTypes: [record.task.domain],
        prerequisites: [],
        conditions: [`${failure.type} tool usage`],
        exceptions: [],
      },
      evidence: [{
        type: "failure",
        sourceId: failure.id,
        description: `Failure: ${failure.error}`,
        strength: 0.9,
      }],
      confidence: 0.7,
      scope: {
        level: "domain-specific",
        domains: [record.task.domain],
        taskTypes: [record.task.intent],
        exclusions: [],
      },
      counterIndications: [],
      actionableGuidance: {
        do: [`Validate inputs before ${failure.type} tool calls`, `Add ${failure.type} error handling`],
        dont: [`Retry same failed operation without changes`, `Ignore ${failure.type} errors`],
        when: [`Using ${failure.type} tools`, `Handling ${failure.type} operations`],
        verification: [`Test with invalid inputs`, `Verify error handling`],
      },
      confidenceIntervals: [],
      tags: [failure.type, "failure", "recovery"],
      version: 1,
      status: "draft",
    };
  }

  private createLessonFromSuccess(record: any): any {
    return {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      projectId: record.projectId,
      sourceExperienceId: record.id,
      title: `Successful pattern: ${record.task.intent}`,
      description: `The approach used for ${record.task.intent} was successful. Key factors: ${record.execution.successfulTools} successful tools, quality score ${record.quality.overall}.`,
      category: "workflow",
      context: {
        taskTypes: [record.task.intent],
        projectTypes: [record.task.domain],
        prerequisites: [],
        conditions: [],
        exceptions: [],
      },
      evidence: [{
        type: "success",
        sourceId: record.id,
        description: `Task completed successfully with quality ${record.quality.overall}`,
        strength: 0.8,
      }],
      confidence: 0.8,
      scope: { level: "domain-specific", domains: [record.task.domain], taskTypes: [record.task.intent], exclusions: [] },
      counterIndications: [],
      actionableGuidance: {
        do: ["Reuse successful approach patterns", "Apply similar verification steps"],
        dont: ["Assume same approach works for all tasks"],
        when: ["Similar task type and domain"],
        verification: ["Verify quality metrics", "Check for regressions"],
      },
      confidenceIntervals: [],
      tags: ["success", "pattern", "workflow"],
      version: 1,
      status: "draft",
    };
  }

  private createLessonFromObservation(record: any, observation: any): any {
    return {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      projectId: record.projectId,
      sourceExperienceId: record.id,
      title: `Insight: ${observation.summary}`,
      description: observation.details || observation.summary,
      category: "workflow",
      context: {
        taskTypes: [record.task.intent],
        projectTypes: [record.task.domain],
        prerequisites: [],
        conditions: [`Observation: ${observation.type}`],
        exceptions: [],
      },
      evidence: [{
        type: "observation",
        sourceId: observation.id,
        description: observation.summary,
        strength: observation.confidence,
      }],
      confidence: observation.confidence,
      scope: { level: "domain-specific", domains: [record.task.domain], taskTypes: [record.task.intent], exclusions: [] },
      counterIndications: [],
      actionableGuidance: {
        do: ["Consider this insight for similar tasks"],
        dont: [],
        when: ["Similar context observed"],
        verification: ["Validate in similar context"],
      },
      confidenceIntervals: [],
      tags: ["insight", "observation"],
      version: 1,
      status: "draft",
    };
  }

  private createLessonFromRecovery(record: any, recovery: any): any {
    return {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      projectId: record.projectId,
      sourceExperienceId: record.id,
      title: `Recovery strategy: ${recovery.type}`,
      description: `Recovery from ${recovery.failureId} using ${recovery.type} was successful. Strategy: ${recovery.description}`,
      category: "recovery",
      context: {
        taskTypes: [],
        projectTypes: [],
        prerequisites: [],
        conditions: [`After ${recovery.type} failure`],
        exceptions: [],
      },
      evidence: [{
        type: "recovery",
        sourceId: recovery.id,
        description: `Successful recovery via ${recovery.type}`,
        strength: 0.8,
      }],
      confidence: 0.75,
      scope: { level: "domain-specific", domains: [], taskTypes: [], exclusions: [] },
      counterIndications: [],
      actionableGuidance: {
        do: [`Try ${recovery.type} for similar failures`],
        dont: [],
        when: ["After similar failure pattern"],
        verification: ["Verify recovery completes successfully"],
      },
      confidenceIntervals: [],
      tags: ["recovery", recovery.type],
      version: 1,
      status: "draft",
    };
  }

  private mapFailureTypeToCategory(type: string): string {
    const map: Record<string, string> = {
      tool: "scripting",
      verification: "verification",
      planning: "architecture",
      execution: "scripting",
      timeout: "performance",
      cancellation: "workflow",
    };
    return map[type] || "workflow";
  }

  private deduplicateAndRank(lessons: any[]): any[] {
    // Simple deduplication by title similarity
    const unique: any[] = [];
    const seen = new Set();

    for (const lesson of lessons) {
      const key = lesson.title.toLowerCase().substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(lesson);
      }
    }

    // Sort by confidence descending
    return unique.sort((a, b) => b.confidence - a.confidence);
  }
}

export function createLessonExtractor(): any {
  return new LessonExtractor();
}